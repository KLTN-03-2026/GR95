const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

// Phải để API không có param lên trên cùng
router.get('/variants-for-promo', promotionController.getVariantsForPromo);
router.get('/', promotionController.getAllPromotions);
router.post('/', promotionController.createPromotion);

// Các API thao tác trên 1 ID cụ thể để dưới cùng
router.get('/:id', promotionController.getPromotionDetail);
router.put('/:id', promotionController.updatePromotion);
router.delete('/:id', promotionController.deletePromotion);

module.exports = router;