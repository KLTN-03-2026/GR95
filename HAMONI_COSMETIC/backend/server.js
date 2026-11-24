// Import các thư viện cần thiết
const express = require("express");
const cors = require("cors");
const multer = require('multer');
require("dotenv").config();
require("./src/config/db");

const http = require("http");
const { Server } = require("socket.io");

// Khởi tạo app Express
const app = express();
const { verifyToken, requireRole } = require('./src/middlewares/authMiddleware');
const staffOnly = [verifyToken, requireRole('ADMIN', 'STAFF')];

// ===============================
// CẤU HÌNH CORS
// ===============================

// Các domain được phép gọi API
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

// Hàm kiểm tra origin dùng chung cho Express và Socket.IO
const checkCorsOrigin = (origin, callback) => {
  // Cho phép request không có origin, ví dụ Postman, server-to-server
  if (!origin) {
    return callback(null, true);
  }

  // Cho phép các origin có trong danh sách
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  console.log("❌ CORS blocked origin:", origin);
  return callback(new Error("Not allowed by CORS"));
};

// --- CÀI ĐẶT MIDDLEWARE ---
app.use(
  cors({
    origin: checkCorsOrigin,
    credentials: true,
  }),
);

// Tạo HTTP server
const server = http.createServer(app);

// Cấu hình Socket.IO
const io = new Server(server, {
  cors: {
    origin: checkCorsOrigin,
    credentials: true,
  },
});

app.set("io", io);

// Khởi tạo socket chat
const chatSocket = require("./src/sockets/chatSocket");
chatSocket(io);

// Middleware parse body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// ĐỊNH TUYẾN ROUTES
// ===============================

const authRoutes = require("./src/routes/authRoutes");
const roleRoutes = require("./src/routes/roleRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const customerRoutes = require("./src/routes/customerRoutes");
const employeeRoutes = require("./src/routes/employeeRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const productRoutes = require("./src/routes/productRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const voucherRoutes = require("./src/routes/voucherRoutes");
const promotionRoutes = require("./src/routes/promotionRoutes");
const orderpaymentRoutes = require("./src/routes/orderpaymentRoutes");
const shoppingcartRoutes = require("./src/routes/shoppingcartRoutes");
const warehouseRoutes = require("./src/routes/warehouseRoutes");
const bannerRoutes = require("./src/routes/bannerRoutes");
const homeRoutes = require("./src/routes/homeRoutes");
const clientProductRoutes = require("./src/routes/clientProductRoutes");
const aiConfigRoutes = require("./src/routes/aiConfigRoutes");
const adminChatRoutes = require("./src/routes/adminChatRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const productreviewRoutes = require("./src/routes/productreviewRoutes");
const orderhistoryRoutes = require("./src/routes/OrderhistoryRoutes");
const orderDetailsRoutes = require("./src/routes/OrderDetailsRoutes");

const { startCassoCron } = require("./src/config/cassoService");

// Đăng ký các API vào hệ thống
app.use("/api/auth", authRoutes);
app.use("/api/roles", staffOnly, roleRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/customers", staffOnly, customerRoutes);
app.use("/api/employees", verifyToken, requireRole('ADMIN'), employeeRoutes);
app.use("/api/orders", staffOnly, orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", staffOnly, dashboardRoutes);
app.use("/api/reports", staffOnly, reportRoutes);
app.use("/api/reviews", staffOnly, reviewRoutes);
app.use("/api/vouchers", staffOnly, voucherRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/orderpayment", orderpaymentRoutes);
app.use("/api/shopping-cart", shoppingcartRoutes);
app.use("/api/warehouse", verifyToken, requireRole('ADMIN', 'STAFF', 'KHO'), warehouseRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/client/products", clientProductRoutes);
app.use("/api/ai-config", staffOnly, aiConfigRoutes);
app.use("/api/admin/chats", staffOnly, adminChatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/product-reviews", productreviewRoutes);
app.use("/api/orderhistory", orderhistoryRoutes);
app.use("/api/orderdetails", orderDetailsRoutes);

// Route mặc định
app.get("/", (req, res) => {
  res.json({
    message: "Chào mừng đến với API của hệ thống Hamoni Cosmetic!",
    status: "Server is running smoothly 🚀",
    allowedOrigins,
  });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: 'File tải lên không hợp lệ hoặc quá lớn' });
  }
  console.error('API error:', error);
  return res.status(500).json({ message: 'Lỗi server' });
});

// ===============================
// HANDLE ROUTE KHÔNG TỒN TẠI
// ===============================

app.use((req, res) => {
  res.status(404).json({
    message: "API route không tồn tại",
    path: req.originalUrl,
  });
});

// ===============================
// KHỞI ĐỘNG SERVER
// ===============================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("=================================");
  console.log(`🚀 Server Backend Hamoni đang chạy tại port: ${PORT}`);
  console.log("✅ CLIENT_URL:", process.env.CLIENT_URL || "Chưa cấu hình");
  console.log("✅ Allowed Origins:", allowedOrigins);
  console.log("=================================");

  // Start polling Casso transactions for online payment confirmations
  startCassoCron();
});
