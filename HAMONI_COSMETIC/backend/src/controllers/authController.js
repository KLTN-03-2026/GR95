// src/controllers/authController.js
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
// const bcrypt = require('bcrypt'); // Mở comment nếu sau này bạn làm chức năng Đăng ký có mã hóa pass

// ==========================================
// CẤU HÌNH GỬI MAIL OTP (Từ code của bạn bạn)
// ==========================================
const otpStore = {};
const pendingRegisterStore = {};
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "dinhthiphuong5@dtu.edu.vn", 
        pass: "ecga ucyl zrfo adhy",
    },
});

// ==========================================
// 1. PHẦN AUTH CỦA BẠN (GIỮ NGUYÊN 100%)
// ==========================================

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ Email và Mật khẩu!" });
        }

        // 1. Truy vấn đúng vào bảng NguoiDung của bạn
        const [users] = await db.execute('SELECT * FROM NguoiDung WHERE Email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({ message: "Email không tồn tại trong hệ thống!" });
        }

        const user = users[0];

        // 2. Kiểm tra trạng thái tài khoản (TrangThai = 1 là hoạt động, 0 là bị khóa/chưa kích hoạt)
        if (user.TrangThai === 0) {
            return res.status(403).json({ message: "Tài khoản chưa được kích hoạt hoặc đã bị khóa!" });
        }

        // 3. Kiểm tra mật khẩu (Giả định đang dùng plain text để test)
        // Nếu dùng bcrypt thì thay bằng: const isMatch = await bcrypt.compare(password, user.MatKhau);
        const isMatch = (password === user.MatKhau); 

        if (!isMatch) {
            return res.status(401).json({ message: "Mật khẩu không chính xác!" });
        }

        // 4. Tạo JWT Token với thông tin an toàn
        const payload = {
            id: user.MaND,
            role: user.MaQuyen 
        };

        const token = jwt.sign(
            payload, 
            process.env.JWT_SECRET || "HAMONI_SECRET_KEY_2026", // Fallback secret key
            { expiresIn: '1d' } 
        );

        // 5. Chuẩn hóa Role trả về cho Frontend React
        let userRole = 'CUST';
        if (user.MaQuyen === 'ADMIN') userRole = 'ADMIN';
        else if (user.MaQuyen === 'STAFF') userRole = 'STAFF';
        else if (user.MaQuyen === 'KHO') userRole = 'KHO';

        // 6. Trả về kết quả
        res.status(200).json({
            message: "Đăng nhập thành công!",
            token: token,
            user: {
                id: user.MaND,
                hoTen: user.HoTen,
                email: user.Email,
                role: userRole,
                maQuyen: user.MaQuyen
            }
        });

    } catch (error) {
        console.error("Lỗi Đăng nhập:", error);
        res.status(500).json({ message: "Lỗi Server nội bộ", error: error.message });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id; 

        // SQL lấy thông tin người dùng (cho cả Admin, Staff và Customer)
        const sql = `
            SELECT u.MaND, u.MaQuyen, u.HoTen, u.Email, u.SoDienThoai, u.TrangThai, u.DiaChi, u.GioiTinh, u.NgaySinh, u.AvatarUrl
            FROM NguoiDung u
            WHERE u.MaND = ?
        `;
        const [users] = await db.execute(sql, [userId]);

        if (users.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy dữ liệu người dùng!" });
        }

        const user = users[0];

        // Check if account is locked
        if (user.TrangThai === 0) {
            return res.status(403).json({ 
                message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin!" 
            });
        }

        // Determine user role
        let displayRole = "Khách hàng";
        if (user.MaQuyen === 'ADMIN') displayRole = "Quản lý";
        else if (user.MaQuyen === 'STAFF') displayRole = "Nhân viên";
        else if (user.MaQuyen === 'KHO') displayRole = "Nhân viên kho";

        res.status(200).json({
            user: {
                id: user.MaND,
                hoTen: user.HoTen,
                email: user.Email,
                soDienThoai: user.SoDienThoai,
                diaChi: user.DiaChi,
                gioiTinh: user.GioiTinh,
                ngaySinh: user.NgaySinh,
                avatarUrl: user.AvatarUrl || null,
                role: displayRole,
                maQuyen: user.MaQuyen
            }
        });

    } catch (error) {
        console.error("Lỗi lấy thông tin cá nhân:", error);
        res.status(500).json({ message: "Lỗi Server", error: error.message });
    }
};

// ==========================================
// 2. PHẦN ĐĂNG KÝ & OTP (Từ code của bạn bạn)
// ==========================================

const register = async (req, res) => {
    // Lưu ý: Bổ sung thêm soDienThoai nếu form đăng ký của bạn có field này
    const { hoTen, email, password, soDienThoai } = req.body; 

    try {
        if (!hoTen || !email || !password) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ Họ tên, Email và Mật khẩu!" });
        }

        const [checkEmail] = await db.execute("SELECT Email FROM NguoiDung WHERE Email = ?", [email]);
        if (checkEmail.length > 0) {
            return res.status(400).json({ message: "Email đã tồn tại trên hệ thống!" });
        }

        // Tạm thời bỏ băm mật khẩu để khớp với logic đăng nhập bằng text thường của bạn
        // const hash = await bcrypt.hash(password, 10);
        const savedPassword = password; 

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const mailOptions = {
            from: '"HAMONI COSMETIC" <dinhthiphuong5@dtu.edu.vn>',
            to: email,
            subject: "MÃ XÁC THỰC - HAMONI",
            html: `<h3>Chào mừng ${hoTen}!</h3><p>Mã OTP của bạn là: <b>${otp}</b></p><p>Mã có hiệu lực trong 5 phút.</p>`,
        };

        await transporter.sendMail(mailOptions);

        pendingRegisterStore[email] = {
            hoTen,
            email,
            password: savedPassword,
            soDienThoai: soDienThoai || '',
            otp: otp,
            expire: Date.now() + 5 * 60 * 1000,
        };

        res.status(200).json({ message: "Mã OTP đã được gửi về Gmail của bạn!" });

    } catch (err) {
        console.error("Lỗi đăng ký:", err);
        res.status(500).json({ message: "Lỗi hệ thống: " + err.message });
    }
};

const resendOTP = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: "Vui lòng nhập email!" });
        }

        const pendingData = pendingRegisterStore[email];
        let displayName = null;

        if (pendingData) {
            displayName = pendingData.hoTen;
        } else {
            const [user] = await db.execute("SELECT HoTen, TrangThai FROM NguoiDung WHERE Email = ?", [email]);
            if (user.length === 0) {
                return res.status(404).json({ message: "Email chưa được đăng ký!" });
            }

            if (user[0].TrangThai === 1) {
                return res.status(400).json({ message: "Tài khoản đã được kích hoạt, không cần gửi lại OTP!" });
            }

            displayName = user[0].HoTen;
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const mailOptions = {
            from: '"HAMONI COSMETIC" <dinhthiphuong5@dtu.edu.vn>',
            to: email,
            subject: "GỬI LẠI MÃ XÁC THỰC - HAMONI",
            html: `<h3>Chào ${displayName}!</h3><p>Mã OTP mới của bạn là: <b>${otp}</b></p>`,
        };

        await transporter.sendMail(mailOptions);

        if (pendingData) {
            pendingRegisterStore[email] = {
                ...pendingData,
                otp,
                expire: Date.now() + 5 * 60 * 1000,
            };
        } else {
            otpStore[email] = {
                otp: otp,
                expire: Date.now() + 5 * 60 * 1000,
            };
        }

        res.status(200).json({ message: "Đã gửi lại mã OTP mới!" });

    } catch (err) {
        res.status(500).json({ message: "Lỗi khi gửi lại OTP: " + err.message });
    }
};

const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const pendingData = pendingRegisterStore[email];

        if (pendingData) {
            if (pendingData.otp !== otp.toString() || Date.now() > pendingData.expire) {
                return res.status(400).json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn!" });
            }

            const [existingUser] = await db.execute("SELECT Email FROM NguoiDung WHERE Email = ?", [email]);
            if (existingUser.length > 0) {
                delete pendingRegisterStore[email];
                return res.status(400).json({ message: "Email đã tồn tại trên hệ thống!" });
            }

            const sql = `INSERT INTO NguoiDung (HoTen, Email, MatKhau, MaQuyen, TrangThai, SoDienThoai, DiaChi)
                         VALUES (?, ?, ?, 'CUST', 1, ?, '')`;
            await db.execute(sql, [pendingData.hoTen, pendingData.email, pendingData.password, pendingData.soDienThoai]);
            delete pendingRegisterStore[email];

            return res.json({ message: "Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay." });
        }

        const data = otpStore[email];
        if (!data || data.otp !== otp.toString() || Date.now() > data.expire) {
            return res.status(400).json({ message: "Mã OTP không hợp lệ hoặc đã hết hạn!" });
        }

        await db.execute("UPDATE NguoiDung SET TrangThai = 1 WHERE Email = ?", [email]);
        delete otpStore[email]; // Xóa OTP sau khi dùng xong
        
        res.json({ message: "Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay." });
    } catch (err) {
        res.status(500).json({ message: "Lỗi khi kích hoạt tài khoản!" });
    }
};

// src/controllers/authController.js

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id; 
        
        if (!userId) {
            return res.status(401).json({ message: "Lỗi xác thực: Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại!" });
        }
        
        const { HoTen, Email, SoDienThoai, GioiTinh, NgaySinh, DiaChi, AvatarUrl } = req.body;
        
        if (!HoTen || !Email) {
            return res.status(400).json({ message: "Họ tên và Email là bắt buộc!" });
        }

        // Validate phone: required and 10 digits
        if (!SoDienThoai || !String(SoDienThoai).trim()) {
            return res.status(400).json({ message: "Số điện thoại là bắt buộc!" });
        }
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(String(SoDienThoai).trim())) {
            return res.status(400).json({ message: "Số điện thoại phải gồm 10 chữ số!" });
        }

        // Ngày sinh là tuỳ chọn: nếu được gửi thì validate, nếu không gửi thì lưu NULL
        if (NgaySinh && String(NgaySinh).trim()) {
            const parsedNgaySinh = new Date(NgaySinh);
            if (Number.isNaN(parsedNgaySinh.getTime())) {
                return res.status(400).json({ message: "Ngày sinh không hợp lệ!" });
            }
            const today = new Date();
            today.setHours(0,0,0,0);
            if (parsedNgaySinh >= today) {
                return res.status(400).json({ message: "Ngày sinh phải trước ngày hôm nay!" });
            }
        }

        // Try to update including AvatarUrl; if the column doesn't exist, fall back to update without it
        let result;
        try {
            result = await db.execute(
                "UPDATE NguoiDung SET HoTen = ?, Email = ?, SoDienThoai = ?, GioiTinh = ?, NgaySinh = ?, DiaChi = ?, AvatarUrl = ? WHERE MaND = ?",
                [HoTen, Email, SoDienThoai || '', GioiTinh || '', NgaySinh && String(NgaySinh).trim() ? NgaySinh : null, DiaChi || '', AvatarUrl || '', userId]
            );
        } catch (err) {
            // If AvatarUrl column missing (migration not applied), fallback to old update
            if (err && err.message && err.message.includes('Unknown column')) {
                console.warn('AvatarUrl column missing, falling back to update without AvatarUrl');
                result = await db.execute(
                    "UPDATE NguoiDung SET HoTen = ?, Email = ?, SoDienThoai = ?, GioiTinh = ?, NgaySinh = ?, DiaChi = ? WHERE MaND = ?",
                    [HoTen, Email, SoDienThoai || '', GioiTinh || '', NgaySinh && String(NgaySinh).trim() ? NgaySinh : null, DiaChi || '', userId]
                );
            } else {
                throw err;
            }
        }

        if (result[0].affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng để cập nhật!" });
        }

        res.status(200).json({ message: "Cập nhật hồ sơ thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật profile:", error);
        res.status(500).json({ message: "Lỗi server khi cập nhật hồ sơ. " + (error.message || "") });
    }
};

const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Lỗi xác thực: Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại!" });
        }

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới!" });
        }

        if (newPassword.length < 3) {
            return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
        }

        const [users] = await db.execute(
            "SELECT MatKhau FROM NguoiDung WHERE MaND = ?",
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng để đổi mật khẩu!" });
        }

        const currentPassword = users[0].MatKhau;
        if (oldPassword !== currentPassword) {
            return res.status(401).json({ message: "Mật khẩu cũ không chính xác!" });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({ message: "Mật khẩu mới phải khác mật khẩu cũ!" });
        }

        const [result] = await db.execute(
            "UPDATE NguoiDung SET MatKhau = ? WHERE MaND = ?",
            [newPassword, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không thể cập nhật mật khẩu!" });
        }

        res.status(200).json({ message: "Đổi mật khẩu thành công!" });
    } catch (error) {
        console.error("Lỗi đổi mật khẩu:", error);
        res.status(500).json({ message: "Lỗi server khi đổi mật khẩu. " + (error.message || "") });
    }
};

module.exports = {
    login,
    getCurrentUser,
    updateProfile,
    changePassword,
    register,
    verifyOTP,
    resendOTP
};
