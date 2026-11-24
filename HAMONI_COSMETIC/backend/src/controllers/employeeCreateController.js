// src/controllers/employeeCreateController.js
const db = require('../config/db'); 
const { hashPassword } = require('../utils/password');

const createEmployee = async (req, res) => {
    try {
        const { HoTen, Email, SoDienThoai, MatKhau, MaQuyen, AvatarUrl } = req.body;

        // 1. Validation Backend: Kiểm tra rỗng
        if (!HoTen || !Email || !SoDienThoai || !MatKhau || !MaQuyen) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ các trường bắt buộc!" });
        }

        // 2. Kiểm tra Email đã tồn tại chưa
        const [existingUser] = await db.execute("SELECT Email FROM NguoiDung WHERE Email = ?", [Email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: "Email này đã được sử dụng. Vui lòng chọn Email khác!" });
        }

        // 3. Lưu mật khẩu đã được băm với salt.
        // Mặc định TrangThai = 1: Đang hoạt động
        await db.execute(
            "INSERT INTO NguoiDung (HoTen, Email, SoDienThoai, MatKhau, MaQuyen, AvatarUrl, TrangThai) VALUES (?, ?, ?, ?, ?, ?, 1)",
            [HoTen, Email, SoDienThoai, await hashPassword(MatKhau), MaQuyen, AvatarUrl || null]
        );

        res.status(201).json({ message: "Thêm nhân viên mới thành công!" });
    } catch (error) {
        console.error("Lỗi khi thêm nhân viên:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi thêm nhân viên!" });
    }
};

module.exports = { createEmployee };
