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

module.exports = {
    getProductById,
    updateProductInfo,
    addProductImage,
    deleteProductImage,
    addProductVariant,
    deleteProductVariant
};