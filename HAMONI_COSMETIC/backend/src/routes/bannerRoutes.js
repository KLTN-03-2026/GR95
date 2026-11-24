const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const staffOnly = [verifyToken, requireRole('ADMIN', 'STAFF')];

// Lấy toàn bộ danh sách banner (hỗ trợ search)
router.get('/', bannerController.getBanners);

// Lấy chi tiết 1 banner
router.get('/:id', bannerController.getBannerById);

// Thêm mới banner
router.post('/', staffOnly, bannerController.createBanner);

// Cập nhật banner
router.put('/:id', staffOnly, bannerController.updateBanner);

// Xóa banner
router.delete('/:id', staffOnly, bannerController.deleteBanner);

module.exports = router;
