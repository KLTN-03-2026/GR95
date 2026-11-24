const db = require('../config/db');

const productreviewController = {
    // ==========================================
    // HÀM 1: KHÁCH HÀNG TẠO ĐÁNH GIÁ
    // ==========================================
    createReview: async (req, res) => {
        let connection;
        try {
            const { MaSP, MaDH, SoSao, BinhLuan } = req.body;
            const MaND = req.user.id;
            
            // Xử lý hình ảnh (nếu có)
            let HinhAnh = null;
            if (req.files && req.files.length > 0) {
                const fileUrls = req.files.map(file => file.path || file.secure_url);
                HinhAnh = JSON.stringify(fileUrls); 
            }

            // Kiểm tra đầu vào cơ bản
            if (!MaND || !MaSP || !MaDH) {
                return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
            }

            connection = await db.getConnection();

            // 1. KIỂM TRA BẢO MẬT: MaSP phải thuộc về một MaBienThe nằm trong MaDH này
            // Logic: JOIN bảng ChiTietDonHang với BienTheSanPham để xác thực sản phẩm
            const checkOrderSql = `
                SELECT dh.MaDH 
                FROM DonHang dh
                JOIN ChiTietDonHang ctdh ON dh.MaDH = ctdh.MaDH
                JOIN BienTheSanPham bt ON ctdh.MaBienThe = bt.MaBienThe
                WHERE dh.MaDH = ? 
                  AND dh.MaND = ? 
                  AND bt.MaSP = ? 
                  AND dh.TrangThai = 'HoanThanh'
            `;
            const [order] = await connection.query(checkOrderSql, [Number(MaDH), Number(MaND), Number(MaSP)]);

            if (order.length === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Lỗi bảo mật: Sản phẩm này không có trong đơn hàng của bạn hoặc đơn hàng chưa hoàn thành!" 
                });
            }

            // 2. KIỂM TRA TRÙNG LẶP: Khóa chặt theo từng đơn hàng cụ thể (MaDH)
            const checkDuplicateSql = `SELECT * FROM DanhGia WHERE MaDH = ? AND MaSP = ? AND MaND = ?`;
            const [existing] = await connection.query(checkDuplicateSql, [Number(MaDH), Number(MaSP), Number(MaND)]);

            if (existing.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Sản phẩm trong đơn hàng này đã được bạn đánh giá rồi!" 
                });
            }

            // 3. KIỂM TRA SỐ SAO
            if (!SoSao || Number(SoSao) === 0) {
                return res.status(400).json({ success: false, message: "Vui lòng chọn số sao đánh giá!" });
            }

            // 4. THỰC HIỆN LƯU VÀO DATABASE
            const sqlInsert = `INSERT INTO DanhGia (MaND, MaSP, MaDH, SoSao, BinhLuan, HinhAnh) VALUES (?, ?, ?, ?, ?, ?)`;
            const [result] = await connection.query(sqlInsert, [Number(MaND), Number(MaSP), Number(MaDH), Number(SoSao), BinhLuan || null, HinhAnh]);
            

            return res.status(201).json({ 
                success: true, 
                message: "Cảm ơn bạn đã đánh giá sản phẩm!",
                data: { MaDG: result.insertId, HinhAnh }
            });
            
        } catch (error) {
            console.error("LỖI TẠI CONTROLLER:", error);
            return res.status(500).json({ success: false, message: "Lỗi Server: " + error.message });
        } finally {
            if (connection) connection.release();
        }
    },

    // ==========================================
    // HÀM 2: KIỂM TRA TRẠNG THÁI ĐÃ ĐÁNH GIÁ (Dành cho FE hiển thị Ổ Khóa)
    // ==========================================
    checkReviewHistory: async (req, res) => {
        let connection;
        try {
            const { MaDH, MaSP } = req.query;
            const MaND = req.user.id;
            if (!MaDH || !MaSP) {
                return res.json({ success: false, message: "Thiếu tham số" });
            }

            connection = await db.getConnection();
            
            // Check theo đúng đơn hàng, sản phẩm và người dùng
            const checkSql = `SELECT * FROM DanhGia WHERE MaDH = ? AND MaSP = ? AND MaND = ?`;
            const [reviews] = await connection.query(checkSql, [Number(MaDH), Number(MaSP), Number(MaND)]);

            if (reviews.length === 0) {
                return res.json({ success: true, hasReview: false }); 
            }

            // Nếu đã có đánh giá, lấy thêm phản hồi của admin (nếu có)
            const review = reviews[0];
            const replySql = `SELECT * FROM DanhGia_PhanHoi WHERE MaDG = ? ORDER BY NgayTao ASC`;
            const [replies] = await connection.query(replySql, [review.MaDG]);

            review.replies = replies; 

            return res.json({ success: true, hasReview: true, data: review });

        } catch (error) {
            console.error("LỖI LẤY LỊCH SỬ:", error);
            return res.status(500).json({ success: false, message: "Lỗi Server" });
        } finally {
            if (connection) connection.release();
        }
    }
};

module.exports = productreviewController;
