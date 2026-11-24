// src/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const uploadCloud = require('../config/cloudinaryConfig'); // Import middleware đã cấu hình sẵn
const { verifyToken } = require('../middlewares/authMiddleware');
const rateLimit = require('../middlewares/rateLimit');

// Middleware uploadCloud.single('image') sẽ tự động lấy file, đẩy lên Cloudinary
router.post('/', verifyToken, rateLimit('upload', 30, 60 * 1000), uploadCloud.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Không tìm thấy file ảnh!" });
    }
    
    // Cloudinary trả về cục data trong req.file, ta lấy cái path (đường dẫn ảnh)
    res.status(200).json({ url: req.file.path }); 
});

module.exports = router;
