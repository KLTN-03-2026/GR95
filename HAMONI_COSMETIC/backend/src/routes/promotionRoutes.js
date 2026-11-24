const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const staffOnly = [verifyToken, requireRole('ADMIN', 'STAFF')];

// ⭐ ROUTES CỤ THỂ (không có :id) PHẢI ĐẶT TRÊN CÙNG
router.get('/variants-for-promo', staffOnly, promotionController.getVariantsForPromo);

// Lấy danh sách chương trình khuyến mãi đang hoạt động (dùng cho dropdown gợi ý)
router.get('/active', promotionController.getActivePromotions);

// ⭐ ROUTES CÓ :id/path PHẢI TRƯỚC :id ĐƠN GIẢN
router.get('/:id/products', promotionController.getPromotionProducts);

// ⭐ ROUTES CHUNG (GET list, POST)
router.get('/', promotionController.getAllPromotions);
router.post('/', staffOnly, promotionController.createPromotion);

// ⭐ ROUTES CÓ :id ĐƠN GIẢN ĐẶT CUỐI CÙNG
router.get('/:id', promotionController.getPromotionDetail);
router.put('/:id', staffOnly, promotionController.updatePromotion);
router.delete('/:id', staffOnly, promotionController.deletePromotion);

module.exports = router;
