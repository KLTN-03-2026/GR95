// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const staffOnly = [verifyToken, requireRole('ADMIN', 'STAFF')];

const productController = require('../controllers/productController'); 
const productCreateController = require('../controllers/productCreateController'); 
const productDetailController = require('../controllers/productDetailController'); // <--- Import cái mới

// ===============================
// ROUTE CHUNG (List & Create)
// ===============================
router.get('/', staffOnly, productController.getAllProducts);
router.post('/', staffOnly, productCreateController.createProduct);

// ===============================
// ROUTE CHI TIẾT (Lấy / Sửa)
// ===============================
router.get('/:id/public', productDetailController.getPublicProductDetail);
router.get('/:id/reviews', productDetailController.getProductReviews);
router.get('/:id/review-reply-eligibility', verifyToken, productDetailController.getReviewReplyEligibility);
router.post('/reviews/:reviewId/replies', verifyToken, productDetailController.postCustomerReply);
router.get('/:id/suggestions', productDetailController.getSuggestedProducts);
router.get('/:id', staffOnly, productDetailController.getProductById);
router.put('/:id', staffOnly, productDetailController.updateProductInfo);
router.delete('/:id', staffOnly, productDetailController.deleteProduct);

// ===============================
// ROUTE QUẢN LÝ HÌNH ẢNH (Image)
// ===============================
router.post('/:id/images', staffOnly, productDetailController.addProductImage);
router.delete('/images/:imageId', staffOnly, productDetailController.deleteProductImage);

// ===============================
// ROUTE QUẢN LÝ BIẾN THỂ (Variant)
// ===============================
router.post('/:id/variants', staffOnly, productDetailController.addProductVariant);
router.delete('/variants/:variantId', staffOnly, productDetailController.deleteProductVariant);

module.exports = router;
