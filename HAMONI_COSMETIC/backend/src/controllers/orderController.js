const db = require('../config/db');

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
    try {
        const { id } = req.params;
        const { newStatus } = req.body;

        const [[old]] = await db.execute(
            `SELECT TrangThai FROM DonHang WHERE MaDH = ?`,
            [id]
        );

        if (!old) return res.status(404).json({ message: "Không tìm thấy" });

        await db.execute(
            `UPDATE DonHang SET TrangThai = ? WHERE MaDH = ?`,
            [newStatus, id]
        );

        await db.execute(`
            INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, NgayTao)
            VALUES (?, ?, ?, NOW())
        `, [id, old.TrangThai, newStatus]);

        res.json({ message: "OK" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// ================= CANCEL ORDER =================
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;

        // check tồn tại
        const [[order]] = await db.execute(
            `SELECT MaDH FROM DonHang WHERE MaDH = ?`,
            [id]
        );

        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy đơn" });
        }

        // 🔥 XÓA CHI TIẾT TRƯỚC (quan trọng nếu có FK)
        await db.execute(
            `DELETE FROM ChiTietDonHang WHERE MaDH = ?`,
            [id]
        );

        // 🔥 XÓA LOG
        await db.execute(
            `DELETE FROM LogDonHang WHERE MaDH = ?`,
            [id]
        );

        // 🔥 XÓA ĐƠN HÀNG
        await db.execute(
            `DELETE FROM DonHang WHERE MaDH = ?`,
            [id]
        );

        res.json({ message: "Đã xóa đơn hàng" });

    } catch (err) {
        console.error(err);
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