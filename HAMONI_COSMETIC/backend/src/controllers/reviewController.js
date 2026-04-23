const db = require('../config/db');

const reviewController = {

    // ===== STATS =====
    getReviewStats: async (req, res) => {
        try {
            const [[total]] = await db.query(
                "SELECT COUNT(*) as count FROM DanhGia"
            );

            const [[pending]] = await db.query(
                "SELECT COUNT(*) as count FROM DanhGia WHERE TrangThai = 'CHUA_PHAN_HOI'"
            );

            res.json({
                total: total.count,
                pending: pending.count
            });
        } catch (error) {
            console.error("STATS ERROR:", error);
            res.status(500).json({ message: error.message });
        }
    },

    // 🔥 [MỚI THÊM] ===== LẤY DANH SÁCH SẢN PHẨM CHO SIDEBAR =====
    getSidebarProducts: async (req, res) => {
        try {
            const query = `
                SELECT 
                    sp.MaSP, 
                    sp.TenSP, 
                    COUNT(dg.MaDG) as TotalReviews,
                    SUM(CASE WHEN dg.TrangThai = 'CHUA_PHAN_HOI' THEN 1 ELSE 0 END) as PendingReviews
                FROM SanPham sp
                JOIN DanhGia dg ON sp.MaSP = dg.MaSP
                GROUP BY sp.MaSP, sp.TenSP
                ORDER BY PendingReviews DESC, TotalReviews DESC
            `;
            const [rows] = await db.query(query);
            res.json(rows);
        } catch (error) {
            console.error("GET SIDEBAR ERROR:", error);
            res.status(500).json({ message: error.message });
        }
    },

    // ===== GET ALL + FILTER + SEARCH + DATE =====
    getAllReviews: async (req, res) => {
        try {
            // 🔥 Thêm MaSP vào biến destructuring
            let { status, search, rating, startDate, endDate, MaSP } = req.query;

            let query = `
                SELECT 
                    dg.MaDG,
                    dg.SoSao,
                    dg.BinhLuan,
                    dg.TrangThai,
                    dg.NgayDanhGia,
                    nd.HoTen,
                    sp.TenSP
                FROM DanhGia dg
                JOIN NguoiDung nd ON dg.MaND = nd.MaND
                JOIN SanPham sp ON dg.MaSP = sp.MaSP
                WHERE 1=1
            `;

            let params = [];

            if (status && status !== 'ALL') {
                query += " AND dg.TrangThai = ?";
                params.push(status);
            }

            if (rating && rating !== 'ALL') {
                query += " AND dg.SoSao = ?";
                params.push(Number(rating));
            }

            if (startDate) {
                query += " AND dg.NgayDanhGia >= ?";
                params.push(startDate);
            }

            if (endDate) {
                query += " AND dg.NgayDanhGia <= ?";
                params.push(endDate);
            }

            // 🔥 [MỚI THÊM] Lọc theo sản phẩm được chọn bên Sidebar
            if (MaSP && MaSP !== 'ALL') {
query += " AND dg.MaSP = ?"; 
                params.push(MaSP); 
            }

            if (search) {
                query += " AND (nd.HoTen LIKE ? OR sp.TenSP LIKE ?)";
                params.push(`%${search}%`, `%${search}%`);
            }

            query += " ORDER BY dg.NgayDanhGia DESC";

            const [rows] = await db.query(query, params);

            // 🔥 GẮN REPLIES VÀO MỖI REVIEW
            for (let review of rows) {
                const [replies] = await db.query(`
                    SELECT 
                        ph.MaPH,
                        ph.NoiDung,
                        ph.NgayTao,
                        nd.HoTen
                    FROM DanhGia_PhanHoi ph
                    JOIN NguoiDung nd ON ph.MaND = nd.MaND
                    WHERE ph.MaDG = ?
                    ORDER BY ph.NgayTao ASC
                `, [review.MaDG]);

                review.replies = replies;
            }

            res.json(rows);

        } catch (error) {
            console.error("GET REVIEWS ERROR:", error);
            res.status(500).json({ message: error.message });
        }
    },

    // ===== GET REPLIES (OPTION - dùng riêng nếu cần) =====
    getRepliesByReview: async (req, res) => {
        try {
            const { id } = req.params;

            const [rows] = await db.query(`
                SELECT 
                    ph.MaPH,
                    ph.NoiDung,
                    ph.NgayTao,
                    nd.HoTen
                FROM DanhGia_PhanHoi ph
                JOIN NguoiDung nd ON ph.MaND = nd.MaND
                WHERE ph.MaDG = ?
                ORDER BY ph.NgayTao ASC
            `, [id]);

            res.json(rows);
        } catch (error) {
            console.error("GET REPLIES ERROR:", error);
            res.status(500).json({ message: error.message });
        }
    },

    // ===== UPDATE STATUS =====
    updateStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            await db.query(
                "UPDATE DanhGia SET TrangThai = ? WHERE MaDG = ?",
                [status, id]
            );

            res.json({ message: "Cập nhật thành công" });
        } catch (error) {
            console.error("UPDATE STATUS ERROR:", error);
            res.status(500).json({ message: error.message });
        }
    },

    // ===== REPLY (CHUẨN THREAD) =====
    replyReview: async (req, res) => {
        try {
            const { id } = req.params;
            let { replyComment } = req.body;

            // ép kiểu an toàn
            replyComment = String(replyComment || "").trim();

            if (!replyComment) {
                return res.status(400).json({ message: "Nội dung phản hồi rỗng!" });
            }

            // ✅ INSERT vào bảng DanhGia_PhanHoi (CHO PHÉP NHIỀU LẦN)
            await db.query(
`INSERT INTO DanhGia_PhanHoi (MaDG, MaND, NoiDung)
                 VALUES (?, ?, ?)`,
                [id, 1, replyComment] // 1 = admin (sau này lấy từ login)
            );

            // ✅ cập nhật trạng thái
            await db.query(
                `UPDATE DanhGia 
                 SET TrangThai = 'DA_PHAN_HOI' 
                 WHERE MaDG = ?`,
                [id]
            );

            res.json({ message: "Đã phản hồi" });

        } catch (error) {
            console.error("REPLY ERROR:", error);
            res.status(500).json({ message: error.message });
        }
    },
};

module.exports = reviewController;