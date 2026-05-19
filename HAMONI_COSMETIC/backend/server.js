// Import các thư viện cần thiết
const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./src/config/db");

const http = require("http");
const { Server } = require("socket.io");

// Khởi tạo app Express
const app = express();

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

  // Cho phép các domain Vercel preview/production
  if (origin.endsWith(".vercel.app")) {
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
app.use("/api/roles", roleRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/orderpayment", orderpaymentRoutes);
app.use("/api/shopping-cart", shoppingcartRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/client/products", clientProductRoutes);
app.use("/api/ai-config", aiConfigRoutes);
app.use("/api/admin/chats", adminChatRoutes);
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

// ===============================
// WEBHOOK CASSO
// ===============================

app.post("/webhook", (req, res) => {
  try {
    console.log("[Webhook Casso] Nhận được dữ liệu từ Casso:", req.body);

    // Verify secret key nếu cần dùng sau
    const signature = req.headers["x-signature"] || "";
    const secretKey = process.env.CASSO_WEBHOOK_SECRET || "1212";

    // Return 200 OK to Casso immediately
    res.status(200).json({
      status: "ok",
      message: "Webhook received",
    });

    console.log("[Webhook Casso] Xử lý giao dịch từ Casso...");
  } catch (error) {
    console.error("[Webhook Casso] Lỗi:", error.message);

    // Return 200 để tránh Casso retry liên tục
    res.status(200).json({
      status: "ok",
    });
  }
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
