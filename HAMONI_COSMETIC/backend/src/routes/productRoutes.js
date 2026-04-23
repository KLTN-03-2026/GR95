// src/routes/productRoutes.js
const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController'); 
const productCreateController = require('../controllers/productCreateController'); 
const productDetailController = require('../controllers/productDetailController'); // <--- Import cái mới

// ===============================
// ROUTE CHUNG (List & Create)
// ===============================
router.get('/', productController.getAllProducts);
router.post('/', productCreateController.createProduct);

// ===============================
// ROUTE CHI TIẾT (Lấy / Sửa)
// ===============================
router.get('/:id', productDetailController.getProductById);
router.put('/:id', productDetailController.updateProductInfo);
router.delete('/:id', productDetailController.deleteProduct);

// ===============================
// ROUTE QUẢN LÝ HÌNH ẢNH (Image)
// ===============================
router.post('/:id/images', productDetailController.addProductImage);
router.delete('/images/:imageId', productDetailController.deleteProductImage);

// ===============================
// ROUTE QUẢN LÝ BIẾN THỂ (Variant)
// ===============================
router.post('/:id/variants', productDetailController.addProductVariant);
router.delete('/variants/:variantId', productDetailController.deleteProductVariant);

module.exports = router;    