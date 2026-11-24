const jwt = require('jsonwebtoken');
const db = require('../config/db');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Truy cập bị từ chối. Không tìm thấy Token xác thực!" });
    }

    const token = authHeader.split(' ')[1];

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) return res.status(500).json({ message: 'Thiếu cấu hình xác thực' });
        const decoded = jwt.verify(token, jwtSecret);
        const [users] = await db.execute(
            'SELECT MaND, MaQuyen, TrangThai FROM NguoiDung WHERE MaND = ?',
            [decoded.id]
        );
        if (!users.length || Number(users[0].TrangThai) !== 1) {
            return res.status(401).json({ message: 'Tài khoản không còn hoạt động' });
        }
        req.user = { id: users[0].MaND, maND: users[0].MaND, role: users[0].MaQuyen };

        next();
    } catch (error) {
        if (!(error instanceof jwt.JsonWebTokenError)) return next(error);
        return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!" });
    }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Cần đăng nhập' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Không có quyền truy cập' });
    next();
};

const requireOwner = (source, key) => (req, res, next) => {
    const supplied = req[source]?.[key];
    if (supplied !== undefined && String(supplied) !== String(req.user.id)) {
        return res.status(403).json({ message: 'Không có quyền truy cập dữ liệu này' });
    }
    next();
};

module.exports = {
    verifyToken,
    requireRole,
    requireOwner
};
