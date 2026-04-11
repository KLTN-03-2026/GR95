const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// 🔥 đặt route cụ thể lên trên
router.get('/logs/:id', orderController.getOrderLogs);

// 🔥 list
router.get('/', orderController.getOrders);

// 🔥 detail
router.get('/:id', orderController.getOrderDetail);

router.put('/:id/status', orderController.updateOrderStatus);
router.put('/:id/cancel', orderController.cancelOrder);

module.exports = router;