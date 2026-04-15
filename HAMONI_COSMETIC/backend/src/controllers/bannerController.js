const db = require('../config/db');

const bannerController = {

    getBanners: async (req, res) => {
        try {
            console.log("🔥 API banner được gọi");

            const sql = `
                SELECT * FROM bannertoancuc
                ORDER BY MaBanner DESC
            `;

            const [data] = await db.query(sql);

            console.log("✅ Data:", data);

            return res.status(200).json(data);

        } catch (err) {
            console.error("❌ SQL ERROR:", err);
            return res.status(500).json({
                message: "Lỗi server",
                error: err.message
            });
        }
    },

    getBannerById: async (req, res) => {
        try {
            const sql = `
                SELECT * FROM bannertoancuc 
                WHERE MaBanner = ?
            `;

            const [data] = await db.query(sql, [req.params.id]);

            return res.status(200).json(data[0]);

        } catch (err) {
            return res.status(500).json(err);
        }
    },

   createBanner: async (req, res) => {
    const { TieuDe, DuongDanAnh, URLDich, ViTriHienThi, ThuTuHienThi, TrangThai } = req.body;
    
    try {
        const [result] = await db.execute(
            `INSERT INTO bannertoancuc 
            (TieuDe, DuongDanAnh, URLDich, ViTriHienThi, ThuTuHienThi, TrangThai) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [TieuDe, DuongDanAnh, URLDich, ViTriHienThi || 'TrangChu', ThuTuHienThi || 0, TrangThai || 'Active']
        );
        
        res.status(201).json({ 
            message: "Thêm banner thành công!", 
            MaBanner: result.insertId,
            url: DuongDanAnh // Trả về để Frontend hiển thị ngay
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi Server không thể thêm banner!" });
    }
},

    updateBanner: async (req, res) => {
const { id } = req.params;
    const { TieuDe, DuongDanAnh, URLDich, ViTriHienThi, ThuTuHienThi, TrangThai } = req.body;
    
    try {
        await db.execute(
            `UPDATE bannertoancuc 
             SET TieuDe=?, DuongDanAnh=?, URLDich=?, ViTriHienThi=?, ThuTuHienThi=?, TrangThai=? 
             WHERE MaBanner=?`,
            [TieuDe, DuongDanAnh, URLDich, ViTriHienThi, ThuTuHienThi, TrangThai, id]
        );
        res.status(200).json({ message: "Cập nhật banner thành công!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server!" });
    }
    },

    deleteBanner: async (req, res) => {
        try {
            const sql = `
                DELETE FROM bannertoancuc
                WHERE MaBanner=?
            `;

            await db.query(sql, [req.params.id]);

            return res.status(200).json("Xóa thành công");

        } catch (err) {
            return res.status(500).json(err);
        }
    }

};

module.exports = bannerController;