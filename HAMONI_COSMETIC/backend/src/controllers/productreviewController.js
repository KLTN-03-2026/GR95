const db = require('../config/db');

const productreviewController = {
    // ==========================================
    // HÀM 1: KHÁCH HÀNG TẠO ĐÁNH GIÁ (CHỈ ĐƯỢC 1 LẦN)
    // ==========================================
    createReview: async (req, res) => {
        try {
            const { MaND, MaSP, MaDH, SoSao, BinhLuan } = req.body;
            
            let HinhAnh = null;
            if (req.files && req.files.length > 0) {
                const fileUrls = req.files.map(file => file.path || file.secure_url);
                HinhAnh = JSON.stringify(fileUrls); 
            }

            if (!MaND || !MaSP || !MaDH) {
                return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
            }

            const connection = await db.getConnection();

            // 1. Kiểm tra khách đã nhận hàng thành công chưa
            const checkOrderSql = `SELECT * FROM DonHang WHERE MaDH = ? AND MaND = ? AND TrangThai = 'HoanThanh'`;
            const [order] = await connection.query(checkOrderSql, [Number(MaDH), Number(MaND)]);

            if (order.length === 0) {
                connection.release();
                return res.status(403).json({ success: false, message: "Lỗi bảo mật: Bạn chỉ được đánh giá những sản phẩm đã giao thành công!" });
            }

            // 2. Kiểm tra khách ĐÃ ĐÁNH GIÁ CHƯA (Khóa chặt, chỉ cho đánh giá 1 lần)
            const checkDuplicateSql = `SELECT * FROM DanhGia WHERE MaDH = ? AND MaSP = ? AND MaND = ?`;
            const [existing] = await connection.query(checkDuplicateSql, [Number(MaDH), Number(MaSP), Number(MaND)]);

            if (existing.length > 0) {
                connection.release();
                return res.status(400).json({ 
                    success: false, 
                    message: "Sản phẩm này đã được bạn đánh giá rồi!" 
                });
            }

            // 3. Nếu chưa đánh giá thì tạo mới
            if (!SoSao || Number(SoSao) === 0) {
                connection.release();
                return res.status(400).json({ success: false, message: "Vui lòng chọn số sao đánh giá!" });
            }

            const sqlInsert = `INSERT INTO DanhGia (MaND, MaSP, MaDH, SoSao, BinhLuan, HinhAnh) VALUES (?, ?, ?, ?, ?, ?)`;
            const [result] = await connection.query(sqlInsert, [Number(MaND), Number(MaSP), Number(MaDH), Number(SoSao), BinhLuan || null, HinhAnh]);
            
            connection.release();

            return res.status(201).json({ 
                success: true, 
                message: "Cảm ơn bạn đã đánh giá sản phẩm!",
                data: { MaDG: result.insertId, HinhAnh }
            });
            
        } catch (error) {
            console.error("LỖI TẠI CONTROLLER:", error);
            return res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
        }
    },

    // ==========================================
    // HÀM 2: LẤY LỊCH SỬ CHAT (KHI KHÁCH BẤM VÀO LẠI ĐƠN HÀNG)
    // ==========================================
    checkReviewHistory: async (req, res) => {
        try {
            const { MaDH, MaSP, MaND } = req.query;
            
            if (!MaDH || !MaSP || !MaND) {
                return res.json({ success: false, message: "Thiếu tham số" });
            }

            const connection = await db.getConnection();
            
            const checkSql = `SELECT * FROM DanhGia WHERE MaDH = ? AND MaSP = ? AND MaND = ?`;
            const [reviews] = await connection.query(checkSql, [Number(MaDH), Number(MaSP), Number(MaND)]);

            if (reviews.length === 0) {
                connection.release();
                return res.json({ success: true, hasReview: false }); 
            }

            const review = reviews[0];
            const replySql = `SELECT * FROM DanhGia_PhanHoi WHERE MaDG = ? ORDER BY NgayTao ASC`;
            const [replies] = await connection.query(replySql, [review.MaDG]);

            review.replies = replies; 
            connection.release();

            return res.json({ success: true, hasReview: true, data: review });

        } catch (error) {
            console.error("LỖI LẤY LỊCH SỬ:", error);
            return res.status(500).json({ success: false, message: "Lỗi Server" });
        }
    }
};

module.exports = productreviewController;