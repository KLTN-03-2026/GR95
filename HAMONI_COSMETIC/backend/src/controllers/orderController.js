const db = require('../config/db');

const STOCK_OUTGOING_STATUS = 'DaXacNhan';
const STOCK_RETURN_STATUS = 'DaHuy';

const loadOrderItems = async (conn, orderId) => {
    const [items] = await conn.execute(`
        SELECT MaBienThe, SoLuong
        FROM ChiTietDonHang
        WHERE MaDH = ?
    `, [orderId]);

    return items;
};

const deductOrderStock = async (conn, orderId) => {
    const items = await loadOrderItems(conn, orderId);

    for (const item of items) {
        const quantity = Number(item.SoLuong || 0);

        const [stocks] = await conn.query(`
            SELECT MaKho, SoLuongTon
            FROM TonKho
            WHERE MaBienThe = ?
            ORDER BY MaKho ASC
            FOR UPDATE
        `, [item.MaBienThe]);

        const totalStock = stocks.reduce((sum, row) => sum + Number(row.SoLuongTon || 0), 0);

        if (totalStock < quantity) {
            throw new Error(`Không đủ tồn kho cho biến thể ${item.MaBienThe}`);
        }

        let remain = quantity;
        for (const stock of stocks) {
            if (remain <= 0) break;

            const available = Number(stock.SoLuongTon || 0);
            if (available <= 0) continue;

            const deduct = Math.min(available, remain);

            await conn.query(`
                UPDATE TonKho
                SET SoLuongTon = SoLuongTon - ?
                WHERE MaKho = ? AND MaBienThe = ?
            `, [deduct, stock.MaKho, item.MaBienThe]);

            remain -= deduct;
        }

        await conn.query(`
            INSERT INTO LogTonKho
            (MaBienThe, LoaiGiaoDich, SoLuongThayDoi, SoLuongTonHienTai, MaThamChieu, GhiChu)
            VALUES (?, 'XUAT_DON_HANG', ?, ?, ?, 'Trừ kho khi xác nhận đơn hàng')
        `, [item.MaBienThe, -quantity, totalStock - quantity, orderId]);
    }
};

const restoreOrderStock = async (conn, orderId) => {
    const items = await loadOrderItems(conn, orderId);

    for (const item of items) {
        const quantity = Number(item.SoLuong || 0);

        const [stocks] = await conn.query(`
            SELECT MaKho, SoLuongTon
            FROM TonKho
            WHERE MaBienThe = ?
            ORDER BY MaKho ASC
            FOR UPDATE
        `, [item.MaBienThe]);

        const primaryStock = stocks[0];

        if (primaryStock) {
            await conn.query(`
                UPDATE TonKho
                SET SoLuongTon = SoLuongTon + ?
                WHERE MaKho = ? AND MaBienThe = ?
            `, [quantity, primaryStock.MaKho, item.MaBienThe]);
        } else {
            await conn.query(`
                INSERT INTO TonKho (MaKho, MaBienThe, SoLuongTon)
                VALUES (1, ?, ?)
            `, [item.MaBienThe, quantity]);
        }

        const [[totalRow]] = await conn.query(`
            SELECT COALESCE(SUM(SoLuongTon), 0) AS SoLuongTon
            FROM TonKho
            WHERE MaBienThe = ?
        `, [item.MaBienThe]);

        await conn.query(`
            INSERT INTO LogTonKho
            (MaBienThe, LoaiGiaoDich, SoLuongThayDoi, SoLuongTonHienTai, MaThamChieu, GhiChu)
            VALUES (?, 'NHAP_DON_HUY', ?, ?, ?, 'Hoàn kho khi hủy đơn hàng')
        `, [item.MaBienThe, quantity, Number(totalRow?.SoLuongTon || 0), orderId]);
    }
};

const getLatestOrderStockMovement = async (conn, orderId) => {
    const [[row]] = await conn.query(`
        SELECT LoaiGiaoDich
        FROM LogTonKho
        WHERE MaThamChieu = ?
          AND LoaiGiaoDich IN ('XUAT_DON_HANG', 'NHAP_DON_HUY')
        ORDER BY NgayTao DESC, MaLog DESC
        LIMIT 1
    `, [orderId]);

    return row?.LoaiGiaoDich || null;
};

// ================= GET LIST =================
// ================= GET LIST =================
exports.getOrders = async (req, res) => {
    try {
        const { search, status, startDate, endDate } = req.query;
        
        // 1. Ép kiểu số chắc chắn (Nghiêm ngặt)
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 5);
        const offset = (page - 1) * limit;

        let whereClause = "WHERE 1=1";
        let params = [];

        if (status && status !== 'all') {
            whereClause += ` AND dh.TrangThai = ?`;
            params.push(status);
        }
        if (search) {
            whereClause += ` AND (dh.MaDH LIKE ? OR nd.HoTen LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }
        if (startDate) {
            whereClause += ` AND dh.NgayDat >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            whereClause += ` AND dh.NgayDat <= ?`;
            params.push(endDate);
        }

        // 2. Lấy tổng số đơn (Dùng Number() để tránh lỗi BigInt/String)
        const [countResult] = await db.execute(
            `SELECT COUNT(*) as total FROM DonHang dh 
             LEFT JOIN NguoiDung nd ON dh.MaND = nd.MaND ${whereClause}`,
            params
        );
            
const limitNum = Number(req.query.limit) || 5; 
const totalItems = Number(countResult[0].total);

// Công thức chuẩn: Chia xong mới làm tròn lên (Ceil)
const totalPages = Math.ceil(totalItems / limitNum) || 1;

console.log(`Check: ${totalItems} items / ${limitNum} per page = ${totalPages} pages`);

        // 3. Lấy dữ liệu trang hiện tại
        const selectQuery = `
            SELECT dh.MaDH as id, dh.NgayDat as ngayTao,
                   dh.TrangThai as trangThai,
                   dh.ThanhTien as tongTien,
                   nd.HoTen as khachHang
            FROM DonHang dh
            LEFT JOIN NguoiDung nd ON dh.MaND = nd.MaND
            ${whereClause}
            ORDER BY dh.NgayDat DESC
            LIMIT ? OFFSET ?
        `;

        // Dùng db.query để truyền limit/offset trực tiếp làm tham số số học
        const [rows] = await db.query(selectQuery, [...params, limit, offset]);

        // Trả về đúng cấu trúc để React nhận diện
        res.json({
            data: rows,
            pagination: {
                totalItems: totalItems,
                totalPages: totalPages,
                currentPage: page,
                limit: limit
            }
        });

    } catch (err) {
        console.error("🔥 Lỗi getOrders:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};
// ================= GET DETAIL =================
exports.getOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Lấy thông tin đơn hàng và khách hàng
        const [[order]] = await db.execute(`
            SELECT dh.*, nd.HoTen, nd.SoDienThoai, nd.Email
            FROM DonHang dh
            LEFT JOIN NguoiDung nd ON dh.MaND = nd.MaND
            WHERE dh.MaDH = ?
        `, [id]);

        if (!order) return res.status(404).json({ message: "Không tìm thấy" });

        // 2. Lấy chi tiết sản phẩm (Lưu ý Alias: TenSP, TenBienThe)
        const [items] = await db.execute(`
            SELECT ct.SoLuong as soLuong, 
                   ct.DonGia as giaBan,
                   sp.TenSP, 
                   bt.TenBienThe
            FROM ChiTietDonHang ct
            JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
            JOIN SanPham sp ON bt.MaSP = sp.MaSP
            WHERE ct.MaDH = ?
        `, [id]);

        // 3. Lấy log lịch sử
        const [logs] = await db.execute(`
            SELECT TrangThaiCu, TrangThaiMoi, GhiChu, NgayTao
            FROM LogDonHang
            WHERE MaDH = ?
            ORDER BY NgayTao ASC
        `, [id]);

        const isPrinted = logs.some(l => l.TrangThaiMoi === 'DaInHoaDon');

        // Mapping lại dữ liệu trả về cho chuẩn với React
        res.json({
            id: order.MaDH,
            ngayTao: order.NgayDat,
            trangThai: order.TrangThai,
            khachHang: {
                hoTen: order.HoTen,
                soDienThoai: order.SoDienThoai,
                email: order.Email
            },
            diaChiGiaoHang: order.ThongTinGiaoHang,
            tamTinh: Number(order.TongTien),
            giamGia: Number(order.TienGiamGia || 0),
            phiShip: Number(order.PhiShip || 0),
            tongTien: Number(order.ThanhTien),
            daInHoaDon: isPrinted,
            chiTiet: items, // Trong items này đã có TenSP (viết hoa T và SP)
            lichSu: logs.map(l => ({
                moTa: `${l.TrangThaiCu || "Khởi tạo"} → ${l.TrangThaiMoi}`,
                thoiGian: l.NgayTao,
                ghiChu: l.GhiChu
            }))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// ================= UPDATE STATUS =================
exports.updateOrderStatus = async (req, res) => {
    const conn = await db.getConnection();

    try {
        const { id } = req.params;
        const { newStatus } = req.body;

        await conn.beginTransaction();

        const [[old]] = await conn.execute(
            `SELECT TrangThai FROM DonHang WHERE MaDH = ?`,
            [id]
        );

        if (!old) {
            await conn.rollback();
            return res.status(404).json({ message: "Không tìm thấy" });
        }

        if (old.TrangThai === newStatus) {
            await conn.rollback();
            return res.json({ message: "OK" });
        }

        const latestStockMovement = await getLatestOrderStockMovement(conn, id);

        if (
            newStatus === STOCK_OUTGOING_STATUS &&
            old.TrangThai !== STOCK_OUTGOING_STATUS &&
            latestStockMovement !== 'XUAT_DON_HANG'
        ) {
            await deductOrderStock(conn, id);
        }

        if (newStatus === STOCK_RETURN_STATUS && old.TrangThai !== STOCK_RETURN_STATUS) {
            if (
                (
                    old.TrangThai === 'ChoXacNhan' ||
                    old.TrangThai === STOCK_OUTGOING_STATUS ||
                    old.TrangThai === 'DangGiao'
                ) &&
                latestStockMovement === 'XUAT_DON_HANG'
            ) {
                await restoreOrderStock(conn, id);
            }
        }

        await conn.execute(
            `UPDATE DonHang SET TrangThai = ? WHERE MaDH = ?`,
            [newStatus, id]
        );

        await conn.execute(`
            INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, NgayTao)
            VALUES (?, ?, ?, NOW())
        `, [id, old.TrangThai, newStatus]);

        await conn.commit();
        res.json({ message: "OK" });

    } catch (err) {
        await conn.rollback();
        console.error(err);
        if (err.message && err.message.includes('Không đủ tồn kho')) {
            return res.status(409).json({ message: err.message });
        }
        res.status(500).json({ message: "Lỗi server" });
    } finally {
        conn.release();
    }
};

// ================= CANCEL ORDER =================
exports.cancelOrder = async (req, res) => {
    const conn = await db.getConnection();

    try {
        const { id } = req.params;

        await conn.beginTransaction();

        // check tồn tại
        const [[order]] = await conn.execute(
            `SELECT TrangThai FROM DonHang WHERE MaDH = ?`,
            [id]
        );

        if (!order) {
            await conn.rollback();
            return res.status(404).json({ message: "Không tìm thấy đơn" });
        }

        const latestStockMovement = await getLatestOrderStockMovement(conn, id);

        if (
            (
                order.TrangThai === 'ChoXacNhan' ||
                order.TrangThai === STOCK_OUTGOING_STATUS ||
                order.TrangThai === 'DangGiao'
            ) &&
            latestStockMovement === 'XUAT_DON_HANG'
        ) {
            await restoreOrderStock(conn, id);
        }

        // ✅ KHÔNG XÓA → chỉ update trạng thái
        await conn.execute(
            `UPDATE DonHang SET TrangThai = 'DaHuy' WHERE MaDH = ?`,
            [id]
        );

        // ✅ ghi log
        await conn.execute(`
            INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, NgayTao)
            VALUES (?, ?, 'DaHuy', NOW())
        `, [id, order.TrangThai]);

        await conn.commit();
        res.json({ message: "Đã hủy đơn hàng" });

    } catch (err) {
        await conn.rollback();
        console.error("🔥 CANCEL ERROR:", err); // 👈 QUAN TRỌNG
        res.status(500).json({ message: "Lỗi server" });
    } finally {
        conn.release();
    }
};

// ================= MARK PRINTED (ONLY ONCE) =================
exports.markOrderPrinted = async (req, res) => {
    try {
        const { id } = req.params;

        const [[order]] = await db.execute(
            `SELECT MaDH FROM DonHang WHERE MaDH = ?`,
            [id]
        );

        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy đơn" });
        }

        const [[printLog]] = await db.execute(
            `SELECT MaLog FROM LogDonHang WHERE MaDH = ? AND TrangThaiMoi = 'DaInHoaDon' LIMIT 1`,
            [id]
        );

        if (printLog) {
            return res.status(409).json({ message: "Đơn hàng đã in hóa đơn trước đó" });
        }

        await db.execute(`
            INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, GhiChu, NgayTao)
            VALUES (?, NULL, 'DaInHoaDon', 'In hóa đơn lần đầu', NOW())
        `, [id]);

        res.json({ message: "Đã ghi nhận in hóa đơn" });
    } catch (err) {
        console.error("🔥 ERROR markOrderPrinted:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};
// ================= GET ORDER LOGS (API RIÊNG) =================
exports.getOrderLogs = async (req, res) => {
    try {
        const { id } = req.params;

        console.log("👉 GET LOGS ONLY ID =", id);

        const [logs] = await db.execute(`
            SELECT 
                l.TrangThaiCu,
                l.TrangThaiMoi,
                l.GhiChu,
                l.NgayTao,
                nd.HoTen AS nguoiThaoTac
            FROM LogDonHang l
            LEFT JOIN NguoiDung nd ON l.NguoiThaoTac = nd.MaND
            WHERE l.MaDH = ?
            ORDER BY l.NgayTao ASC
        `, [id]);

        const lichSu = logs.map(l => ({
            moTa: `${l.TrangThaiCu || "Khởi tạo"} → ${l.TrangThaiMoi}`,
            thoiGian: l.NgayTao,
            ghiChu: l.GhiChu,
            nguoiThaoTac: l.nguoiThaoTac || "Hệ thống"
        }));

        console.log("👉 LOGS ONLY:", lichSu);

        res.json(lichSu);

    } catch (err) {
        console.error("🔥 ERROR getOrderLogs:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};