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

    // ===== GET ALL + FILTER + SEARCH + DATE =====
    getAllReviews: async (req, res) => {
        try {
            let { status, search, rating, startDate, endDate } = req.query;

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

            // ===== FILTER STATUS =====
            if (status && status !== 'ALL') {
                query += " AND dg.TrangThai = ?";
                params.push(status);
            }

            // ===== FILTER RATING =====
            if (rating && rating !== 'ALL') {
                query += " AND dg.SoSao = ?";
                params.push(Number(rating));
            }

            // ===== 🔥 FIX FILTER NGÀY CHUẨN =====
            if (startDate) {
                query += " AND dg.NgayDanhGia >= ?";
                params.push(startDate);
            }

            if (endDate) {
                query += " AND dg.NgayDanhGia <= ?";
                params.push(endDate);
            }

            // ===== SEARCH =====
            if (search) {
                query += " AND (nd.HoTen LIKE ? OR sp.TenSP LIKE ?)";
                params.push(`%${search}%`, `%${search}%`);
            }

            query += " ORDER BY dg.NgayDanhGia DESC";

            // ===== DEBUG (có thể xoá sau) =====
            console.log("QUERY:", query);
            console.log("PARAMS:", params);

            const [rows] = await db.query(query, params);

            res.json(rows);

        } catch (error) {
            console.error("GET REVIEWS ERROR:", error);
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

    // ===== REPLY =====
    replyReview: async (req, res) => {
        try {
            const { id } = req.params;
            const { replyComment } = req.body;

            await db.query(
                "UPDATE DanhGia SET BinhLuan = CONCAT(BinhLuan, '\\nAdmin: ', ?) WHERE MaDG = ?",
                [replyComment, id]
            );

            await db.query(
                "UPDATE DanhGia SET TrangThai = 'DA_PHAN_HOI' WHERE MaDG = ?",
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