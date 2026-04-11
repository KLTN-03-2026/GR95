// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");


router.post("/login", authController.login);
router.get("/me", verifyToken, authController.getCurrentUser); 

router.put("/profile", verifyToken, authController.updateProfile);
router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyOTP); 
router.post("/resend-otp", authController.resendOTP); 

module.exports = router;