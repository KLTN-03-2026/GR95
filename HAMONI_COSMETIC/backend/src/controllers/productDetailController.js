// src/controllers/productDetailController.js
const db = require('../config/db');

// ==========================================
// 1. LẤY TOÀN BỘ DỮ LIỆU CHI TIẾT (INFO, IMAGES, VARIANTS)
// ==========================================
const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        // Lấy thông tin cơ bản
        const [infoResult] = await db.execute('SELECT * FROM SanPham WHERE MaSP = ?', [id]);
        if (infoResult.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
        }

        // Lấy danh sách hình ảnh (Đa hình)
        const [imagesResult] = await db.execute(
            'SELECT * FROM HinhAnh WHERE LoaiThamChieu = "SanPham" AND MaThamChieu = ?', 
            [id]
        );

        // Lấy danh sách biến thể
        const [variantsResult] = await db.execute(
            'SELECT * FROM BienTheSanPham WHERE MaSP = ?', 
            [id]
        );

        // Gộp lại và trả về cho React
        res.status(200).json({
            info: infoResult[0],
            images: imagesResult,
            variants: variantsResult
        });
    } catch (error) {
        console.error("Lỗi lấy chi tiết sản phẩm:", error);
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

// ==========================================
// 1.1 CHI TIẾT SẢN PHẨM CHO CLIENT
// ==========================================
const getPublicProductDetail = async (req, res) => {
    const { id } = req.params;

    try {
        const [productRows] = await db.execute(
            `SELECT sp.MaSP, sp.MaDM, sp.TenSP, sp.MoTa, sp.ThanhPhan, sp.CachSuDung, sp.LoaiDaPhuHop, dm.TenDM
             FROM SanPham sp
             LEFT JOIN DanhMuc dm ON dm.MaDM = sp.MaDM
             WHERE sp.MaSP = ?`,
            [id]
        );

        if (productRows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm!' });
        }

        const [imageRows] = await db.execute(
            `SELECT MaHinhAnh, DuongDanAnh, LaAnhChinh, ThuTuHienThi
             FROM HinhAnh
             WHERE LoaiThamChieu = 'SanPham' AND MaThamChieu = ?
             ORDER BY LaAnhChinh DESC, ThuTuHienThi ASC, MaHinhAnh ASC`,
            [id]
        );

        const [variantRows] = await db.execute(
            `SELECT
                bt.MaBienThe,
                bt.TenBienThe,
                bt.Gia,
                COALESCE(SUM(tk.SoLuongTon), 0) AS SoLuongTon
             FROM BienTheSanPham bt
             LEFT JOIN TonKho tk ON tk.MaBienThe = bt.MaBienThe
             WHERE bt.MaSP = ?
             GROUP BY bt.MaBienThe, bt.TenBienThe, bt.Gia
             ORDER BY bt.Gia ASC, bt.MaBienThe ASC`,
            [id]
        );

        const [stockRows] = await db.execute(
            `SELECT COALESCE(SUM(tk.SoLuongTon), 0) AS SoLuongTon
             FROM BienTheSanPham bt
             LEFT JOIN TonKho tk ON tk.MaBienThe = bt.MaBienThe
             WHERE bt.MaSP = ?`,
            [id]
        );

        const [ratingRows] = await db.execute(
            `SELECT
                COALESCE(ROUND(AVG(SoSao), 1), 0) AS SoSaoTB,
                COUNT(*) AS LuotDanhGia
             FROM DanhGia
             WHERE MaSP = ? AND IsHidden = 0`,
            [id]
        );

        const lowestPrice = variantRows.length > 0 ? Number(variantRows[0].Gia || 0) : 0;

        res.status(200).json({
            info: {
                ...productRows[0],
                GiaBan: lowestPrice,
                SoLuongTon: Number(stockRows[0]?.SoLuongTon || 0),
                SoSaoTB: Number(ratingRows[0]?.SoSaoTB || 0),
                LuotDanhGia: Number(ratingRows[0]?.LuotDanhGia || 0)
            },
            images: imageRows,
            variants: variantRows
        });
    } catch (error) {
        console.error('Lỗi lấy chi tiết sản phẩm client:', error);
        res.status(500).json({ message: 'Lỗi Server!' });
    }
};

// ==========================================
// 1.2 ĐÁNH GIÁ SẢN PHẨM CHO CLIENT
// ==========================================
const getProductReviews = async (req, res) => {
    const { id } = req.params;
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 4);
    const safeLimit = Number.isFinite(limit) ? limit : 4;

    try {
        const [rows] = await db.execute(
            `SELECT
                dg.MaDG,
                dg.SoSao,
                dg.BinhLuan,
                dg.NgayDanhGia,
                nd.HoTen
             FROM DanhGia dg
             JOIN NguoiDung nd ON nd.MaND = dg.MaND
             WHERE dg.MaSP = ? AND dg.IsHidden = 0
             ORDER BY dg.NgayDanhGia DESC
             LIMIT ${safeLimit}`,
            [id]
        );

        res.status(200).json(rows);
    } catch (error) {
        console.error('Lỗi lấy đánh giá sản phẩm:', error);
        res.status(500).json({ message: 'Lỗi Server!' });
    }
};

// ==========================================
// 1.3 SẢN PHẨM GỢI Ý CHO CLIENT
// ==========================================
const getSuggestedProducts = async (req, res) => {
    const { id } = req.params;
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 4);
    const safeLimit = Number.isFinite(limit) ? limit : 4;

    try {
        const [categoryRows] = await db.execute(
            'SELECT MaDM FROM SanPham WHERE MaSP = ?',
            [id]
        );

        if (categoryRows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm!' });
        }

        const maDM = categoryRows[0].MaDM;

        const [rows] = await db.execute(
            `SELECT
                sp.MaSP,
                sp.TenSP,
                COALESCE(MIN(bt.Gia), 0) AS GiaBan,
                COALESCE(ROUND(AVG(dg.SoSao), 1), 0) AS SoSaoTB,
                (
                    SELECT ha.DuongDanAnh
                    FROM HinhAnh ha
                    WHERE ha.LoaiThamChieu = 'SanPham' AND ha.MaThamChieu = sp.MaSP
                    ORDER BY ha.LaAnhChinh DESC, ha.ThuTuHienThi ASC, ha.MaHinhAnh ASC
                    LIMIT 1
                ) AS AnhChinh
             FROM SanPham sp
             LEFT JOIN BienTheSanPham bt ON bt.MaSP = sp.MaSP
             LEFT JOIN DanhGia dg ON dg.MaSP = sp.MaSP AND dg.IsHidden = 0
             WHERE sp.MaDM = ? AND sp.MaSP <> ?
             GROUP BY sp.MaSP, sp.TenSP
             ORDER BY SoSaoTB DESC, sp.NgayTao DESC
             LIMIT ${safeLimit}`,
            [maDM, id]
        );

        res.status(200).json(rows);
    } catch (error) {
        console.error('Lỗi lấy sản phẩm gợi ý:', error);
        res.status(500).json({ message: 'Lỗi Server!' });
    }
};

// ==========================================
// 2. CẬP NHẬT THÔNG TIN CƠ BẢN CỦA SẢN PHẨM
// ==========================================
const updateProductInfo = async (req, res) => {
    const { id } = req.params;
    const { TenSP, MaDM, MoTa, ThanhPhan, CachSuDung, LoaiDaPhuHop } = req.body;
    try {
        await db.execute(
            `UPDATE SanPham 
             SET TenSP = ?, MaDM = ?, MoTa = ?, ThanhPhan = ?, CachSuDung = ?, LoaiDaPhuHop = ? 
             WHERE MaSP = ?`,
            [TenSP, MaDM, MoTa, ThanhPhan, CachSuDung, LoaiDaPhuHop, id]
        );
        res.status(200).json({ message: "Cập nhật thông tin thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật sản phẩm:", error);
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

// ==========================================
// 3. QUẢN LÝ HÌNH ẢNH (THÊM / XÓA)
// ==========================================
const addProductImage = async (req, res) => {
    const { id } = req.params;
    const { DuongDanAnh } = req.body;
    try {
        const [result] = await db.execute(
            `INSERT INTO HinhAnh (LoaiThamChieu, MaThamChieu, DuongDanAnh, LaAnhChinh) 
             VALUES ('SanPham', ?, ?, 0)`,
            [id, DuongDanAnh]
        );
        res.status(201).json({ message: "Đã thêm ảnh!", MaHinhAnh: result.insertId });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

const deleteProductImage = async (req, res) => {
    const { imageId } = req.params;
    try {
        await db.execute('DELETE FROM HinhAnh WHERE MaHinhAnh = ?', [imageId]);
        res.status(200).json({ message: "Đã xóa ảnh!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

// ==========================================
// 4. QUẢN LÝ BIẾN THỂ (THÊM / XÓA)
// ==========================================
const addProductVariant = async (req, res) => {
    const { id } = req.params;
    const { TenBienThe, Gia } = req.body;
    try {
        const [result] = await db.execute(
            `INSERT INTO BienTheSanPham (MaSP, TenBienThe, Gia) VALUES (?, ?, ?)`,
            [id, TenBienThe, Gia]
        );
        res.status(201).json({ message: "Đã thêm biến thể!", MaBienThe: result.insertId });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

const deleteProductVariant = async (req, res) => {
    const { variantId } = req.params;
    try {
        // Tương lai: Nên check xem biến thể này có đang nằm trong Đơn Hàng nào không trước khi xóa
        await db.execute('DELETE FROM BienTheSanPham WHERE MaBienThe = ?', [variantId]);
        res.status(200).json({ message: "Đã xóa biến thể!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

// ==========================================
// 5. XÓA SẢN PHẨM
// ==========================================
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    const conn = await db.getConnection();

    try {
        const [productRows] = await conn.execute('SELECT MaSP FROM SanPham WHERE MaSP = ?', [id]);
        if (productRows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xóa!' });
        }

        // Chặn xóa khi sản phẩm đã phát sinh đơn hàng qua biến thể
        const [usedInOrderRows] = await conn.execute(
            `SELECT 1
             FROM ChiTietDonHang ct
             JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
             WHERE bt.MaSP = ?
             LIMIT 1`,
            [id]
        );

        if (usedInOrderRows.length > 0) {
            return res.status(409).json({
                message: 'Không thể xóa sản phẩm đã phát sinh đơn hàng. Hãy ẩn sản phẩm thay vì xóa.'
            });
        }

        await conn.beginTransaction();

        // Dọn dữ liệu liên quan trước khi xóa sản phẩm
        await conn.execute(
            `DELETE FROM LichSuTonKho
             WHERE MaBienThe IN (SELECT MaBienThe FROM BienTheSanPham WHERE MaSP = ?)`,
            [id]
        );

        await conn.execute(
            `DELETE FROM TonKho
             WHERE MaBienThe IN (SELECT MaBienThe FROM BienTheSanPham WHERE MaSP = ?)`,
            [id]
        );

        await conn.execute(
            `DELETE FROM SanPham_KhuyenMai
             WHERE MaBienThe IN (SELECT MaBienThe FROM BienTheSanPham WHERE MaSP = ?)`,
            [id]
        );

        await conn.execute(
            `DELETE FROM HinhAnh
             WHERE LoaiThamChieu = 'SanPham' AND MaThamChieu = ?`,
            [id]
        );

        await conn.execute('DELETE FROM BienTheSanPham WHERE MaSP = ?', [id]);
        await conn.execute('DELETE FROM SanPham WHERE MaSP = ?', [id]);

        await conn.commit();
        return res.status(200).json({ message: 'Xóa sản phẩm thành công!' });
    } catch (error) {
        await conn.rollback();
        console.error('Lỗi xóa sản phẩm:', error);
        return res.status(500).json({ message: 'Lỗi server khi xóa sản phẩm!' });
    } finally {
        conn.release();
    }
};

module.exports = {
    getProductById,
    getPublicProductDetail,
    getProductReviews,
    getSuggestedProducts,
    updateProductInfo,
    addProductImage,
    deleteProductImage,
    addProductVariant,
    deleteProductVariant,
    deleteProduct
};