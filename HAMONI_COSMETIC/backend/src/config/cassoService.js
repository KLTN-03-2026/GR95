const axios = require('axios');
const db = require('./db');
let polling = false;

const checkCassoTransactions = async () => {
    console.log("--- [" + new Date().toLocaleString() + "] Đang quét giao dịch từ Casso (30s) ---");
    let conn;
    try {
        const apiKey = String(process.env.CASSO_API_KEY || '').trim();
        if (!apiKey) {
            console.warn('Bỏ qua quét Casso: chưa cấu hình CASSO_API_KEY');
            return;
        }

        conn = await db.getConnection();
        
        // 1. Gọi API Casso lấy 10 giao dịch mới nhất
        const response = await axios.get('https://oauth.casso.vn/v2/transactions?sort=DESC&pageSize=10', {
            headers: {
                'Authorization': `Apikey ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const transactions = response.data.data.records;
        if (!transactions || transactions.length === 0) return;

        await conn.beginTransaction();

        for (const transaction of transactions) {
            const content = String(transaction.description || '');
            const amount = Number(transaction.amount || 0);
            const transactionId = String(transaction.id || transaction.transactionId || transaction.transactionCode || transaction.code || '').trim();

            // Ignore outgoing/neutral transactions to avoid false positives.
            if (amount <= 0) continue;
            
            // 2. Tìm mã đơn hàng (HM + số, ví dụ HM52)
            const match = content.match(/HM[- ]?(\d+)/i);
            if (!match) continue;

            const orderId = Number(match[1]);
            if (!orderId) continue;

            await conn.query('SAVEPOINT casso_record');
            try {

            // 3. Chỉ nhận đơn đang chờ thanh toán và số tiền khớp chính xác với đơn hàng.
            const [[orderRow]] = await conn.execute(
                `
                SELECT dh.MaDH, dh.ThanhTien, dh.TrangThai, tt.TrangThai AS TrangThaiThanhToan, tt.PhuongThuc
                FROM DonHang dh
                JOIN ThanhToan tt ON tt.MaDH = dh.MaDH
                WHERE dh.MaDH = ?
                LIMIT 1 FOR UPDATE
                `,
                [orderId]
            );

            if (!orderRow) {
                console.log(`==> Không tìm thấy đơn hàng / thanh toán cho đơn ${orderId}`);
                continue;
            }

            if (String(orderRow.PhuongThuc || '').toUpperCase() !== 'VNPAY') {
                console.log(`==> Bỏ qua đơn ${orderId} vì không phải thanh toán VNPAY`);
                continue;
            }

            if (String(orderRow.TrangThaiThanhToan || '') === 'DaThanhToan') {
                console.log(`==> Đơn ${orderId} đã được thanh toán trước đó`);
                continue;
            }

            if (!transactionId) continue;

            const [[usedTransaction]] = await conn.execute(
                'SELECT MaDH FROM ThanhToan WHERE MaGiaoDichDoiTac = ? LIMIT 1',
                [transactionId]
            );
            if (usedTransaction) continue;

            const expectedAmount = Math.round(Number(orderRow.ThanhTien || 0));
            const incomingAmount = Math.round(amount);

            if (incomingAmount !== expectedAmount) {
                console.log(`==> Bỏ qua giao dịch cho đơn ${orderId} vì số tiền không khớp. Thực nhận: ${incomingAmount}, cần: ${expectedAmount}`);
                continue;
            }

            if (orderRow.TrangThai === 'DaHuy') {
                await conn.execute(
                    `UPDATE ThanhToan SET TrangThai = 'DaThanhToan', NgayThanhToan = NOW(), MaGiaoDichDoiTac = ? WHERE MaDH = ?`,
                    [transactionId, orderId]
                );
                await conn.execute(
                    `INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, GhiChu, NgayTao)
                     VALUES (?, 'DaHuy', 'DaHuy', 'Đã nhận chuyển khoản sau khi hủy; cần hoàn tiền', NOW())`,
                    [orderId]
                );
                continue;
            }

            console.log(`==> Tìm thấy thanh toán cho đơn: ${orderId}. Nội dung: ${content}${transactionId ? ` | GD: ${transactionId}` : ''}`);
            console.log(`==> Cập nhật trạng thái thanh toán cho đơn ${orderId}...`);

            // Trừ kho nếu chưa trừ
            const [[latestStockLog]] = await conn.execute(
                `SELECT LoaiGiaoDich FROM LogTonKho WHERE MaThamChieu = ? AND LoaiGiaoDich = 'XUAT_DON_HANG' LIMIT 1`,
                [orderId]
            );
            
            if (!latestStockLog) {
                console.log(`==> Trừ kho cho đơn ${orderId}...`);
                
                // Lấy danh sách sản phẩm trong đơn
                const [orderItems] = await conn.execute(
                    `SELECT MaBienThe, SoLuong FROM ChiTietDonHang WHERE MaDH = ?`,
                    [orderId]
                );

                // Trừ từng sản phẩm khỏi kho
                for (const item of orderItems) {
                    const quantity = Number(item.SoLuong || 0);
                    
                    const [stocks] = await conn.execute(
                        `SELECT MaKho, SoLuongTon FROM TonKho WHERE MaBienThe = ? ORDER BY MaKho ASC FOR UPDATE`,
                        [item.MaBienThe]
                    );

                    const totalStock = stocks.reduce((sum, row) => sum + Number(row.SoLuongTon || 0), 0);
                    if (totalStock < quantity) {
                        console.log(`==> Lỗi: không đủ tồn kho cho biến thể ${item.MaBienThe}`);
                        const stockError = new Error(`Không đủ tồn kho cho biến thể ${item.MaBienThe} của đơn ${orderId}`);
                        stockError.code = 'OUT_OF_STOCK';
                        throw stockError;
                    }

                    let remain = quantity;
                    for (const stock of stocks) {
                        if (remain <= 0) break;
                        
                        const available = Number(stock.SoLuongTon || 0);
                        if (available <= 0) continue;
                        
                        const deduct = Math.min(available, remain);
                        
                        await conn.execute(
                            `UPDATE TonKho SET SoLuongTon = SoLuongTon - ? WHERE MaKho = ? AND MaBienThe = ?`,
                            [deduct, stock.MaKho, item.MaBienThe]
                        );
                        
                        remain -= deduct;
                    }

                    // Ghi log trừ kho
                    await conn.execute(
                        `INSERT INTO LogTonKho (MaBienThe, LoaiGiaoDich, SoLuongThayDoi, SoLuongTonHienTai, MaThamChieu, GhiChu)
                         VALUES (?, 'XUAT_DON_HANG', ?, ?, ?, ?)`,
                        [item.MaBienThe, -quantity, totalStock - quantity, orderId, 'Trừ kho từ webhook Casso']
                    );
                }
                console.log(`==> Trừ kho xong cho đơn ${orderId}`);
            }

            // Chỉ ghi nhận đã thanh toán sau khi toàn bộ mặt hàng trừ kho thành công.
            await conn.execute(
                `UPDATE ThanhToan SET TrangThai = 'DaThanhToan', NgayThanhToan = NOW(), MaGiaoDichDoiTac = ? WHERE MaDH = ?`,
                [transactionId, orderId]
            );
            await conn.execute(
                `UPDATE DonHang SET TrangThai = 'ChoXacNhan' WHERE MaDH = ?`,
                [orderId]
            );

            // Xóa sản phẩm khỏi giỏ hàng
            console.log(`==> Xóa sản phẩm khỏi giỏ hàng cho đơn ${orderId}...`);
            const [orderItems2] = await conn.execute(
                `SELECT MaBienThe FROM ChiTietDonHang WHERE MaDH = ?`,
                [orderId]
            );
            
            if (orderItems2.length > 0) {
                const variantIds = [...new Set(
                    orderItems2
                        .map((item) => Number(item.MaBienThe))
                        .filter((id) => Number.isInteger(id) && id > 0)
                )];

                if (variantIds.length > 0) {
                    const placeholders = variantIds.map(() => '?').join(', ');
                    await conn.execute(
                        `DELETE FROM GioHang WHERE MaND = (SELECT MaND FROM DonHang WHERE MaDH = ?) AND MaBienThe IN (${placeholders})`,
                        [orderId, ...variantIds]
                    );
                    console.log(`==> Xóa ${variantIds.length} sản phẩm khỏi giỏ hàng`);
                }
            }
            } catch (recordError) {
                await conn.query('ROLLBACK TO SAVEPOINT casso_record');
                if (recordError.code === 'OUT_OF_STOCK') {
                    const [[currentOrder]] = await conn.execute('SELECT TrangThai, MaVoucher FROM DonHang WHERE MaDH = ? FOR UPDATE', [orderId]);
                    await conn.execute(
                        `UPDATE ThanhToan SET TrangThai = 'DaThanhToan', NgayThanhToan = NOW(), MaGiaoDichDoiTac = ? WHERE MaDH = ?`,
                        [transactionId, orderId]
                    );
                    await conn.execute(`UPDATE DonHang SET TrangThai = 'DaHuy', DaHoanTien = 0 WHERE MaDH = ?`, [orderId]);
                    if (currentOrder?.MaVoucher) {
                        await conn.execute(
                            `UPDATE Voucher SET SoLuongDaDung = GREATEST(COALESCE(SoLuongDaDung, 0) - 1, 0) WHERE MaVoucher = ?`,
                            [currentOrder.MaVoucher]
                        );
                    }
                    await conn.execute(
                        `INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, GhiChu, NgayTao) VALUES (?, ?, 'DaHuy', ?, NOW())`,
                        [orderId, currentOrder?.TrangThai || null, 'Đã nhận chuyển khoản nhưng hết hàng; cần hoàn tiền']
                    );
                }
                console.error(`Không xử lý được giao dịch ${transactionId || orderId}:`, recordError.message);
            }
        }
        await conn.commit();
    } catch (error) {
        if (conn) await conn.rollback();
        if (error.response?.status === 401) {
            console.error('Lỗi quét Casso: API key không hợp lệ hoặc đã bị thu hồi. Hãy tạo lại CASSO_API_KEY trong Casso Flow.');
        } else {
            console.error("Lỗi quét Casso:", error.response ? error.response.data : error.message);
        }
    } finally {
        if (conn) conn.release();
    }
};

// Thiết lập chạy tự động mỗi 30 giây một lần
const startCassoCron = () => {
    if (!String(process.env.CASSO_API_KEY || '').trim()) {
        console.warn('Không khởi động Casso cron vì thiếu CASSO_API_KEY');
        return;
    }

    // Chạy kiểm tra giao dịch mỗi 30 giây (30000 milliseconds)
    setInterval(() => {
        if (polling) return;
        polling = true;
        checkCassoTransactions().finally(() => { polling = false; });
    }, 30000);
};

module.exports = { startCassoCron, checkCassoTransactions };
