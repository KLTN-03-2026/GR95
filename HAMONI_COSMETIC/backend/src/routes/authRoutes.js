// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
const rateLimit = require('../middlewares/rateLimit');
// Trích xuất thêm forgotPassword, resetPassword
const {
  login,
  register,
  verifyOTP,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

// Khai báo Router
router.post("/forgot-password", rateLimit('forgot-password', 5, 15 * 60 * 1000), forgotPassword);
router.post("/reset-password", rateLimit('reset-password', 10, 15 * 60 * 1000), resetPassword);

router.post("/login", rateLimit('login', 20, 15 * 60 * 1000), authController.login);
router.get("/me", verifyToken, authController.getCurrentUser);

router.put("/profile", verifyToken, authController.updateProfile);
router.put("/change-password", verifyToken, authController.changePassword);
router.post("/register", rateLimit('register', 5, 15 * 60 * 1000), authController.register);
router.post("/verify-otp", rateLimit('verify-otp', 10, 15 * 60 * 1000), authController.verifyOTP);
router.post("/resend-otp", rateLimit('resend-otp', 5, 15 * 60 * 1000), authController.resendOTP);

module.exports = router;
