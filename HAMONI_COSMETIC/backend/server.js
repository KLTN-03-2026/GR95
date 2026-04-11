// Import các thư viện cần thiết
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load biến môi trường từ file .env
const db = require('./src/config/db'); // Khởi tạo kết nối Database ngay khi chạy server

// Khởi tạo app Express
const app = express();

// --- CÀI ĐẶT MIDDLEWARE ---
// 1. Cho phép Frontend (cổng 5173) gọi API đến Backend (cổng 5000) mà không bị lỗi CORS
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

// 2. Cho phép Express đọc được dữ liệu định dạng JSON từ Client gửi lên
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ĐỊNH TUYẾN (ROUTES) CHÍNH THỨC ---
// Import các file routes từ thư mục src/routes
const authRoutes = require('./src/routes/authRoutes');
const roleRoutes = require('./src/routes/roleRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes'); // Thêm route cho nhân viên
const uploadRoutes = require('./src/routes/uploadRoutes'); // Thêm route cho upload ảnh
const orderRoutes = require('./src/routes/orderRoutes'); // Thêm route cho đơn hàng
const productRoutes = require('./src/routes/productRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

// Đăng ký route cho upload ảnh
app.use('/api/upload', uploadRoutes);
// Đăng ký các API vào hệ thống
// API đăng nhập giờ đây sẽ hoạt động tại: POST http://localhost:5000/api/auth/login
app.use('/api/auth', authRoutes); 
app.use('/api/roles', roleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes); // Đăng ký route cho nhân viên
app.use('/api/orders', orderRoutes); // Đăng ký route cho đơn hàng
app.use('/api/products', productRoutes); // Đăng ký route cho sản phẩm
app.use('/api/upload', uploadRoutes); // Gắn đường dẫn
app.use('/api/dashboard', dashboardRoutes); // Gắn đường dẫn cho dashboard
app.use('/api/reports', reportRoutes); // Gắn đường dẫn cho báo cáo

// Route mặc định (Root)
app.get('/', (req, res) => {
    res.json({ 
        message: "Chào mừng đến với API của hệ thống Hamoni Cosmetic!",
        status: "Server is running smoothly 🚀"
    });
});

// --- KHỞI ĐỘNG SERVER ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Server Backend Hamoni đang chạy tại: http://localhost:${PORT}`);
    console.log(`=================================`);
});