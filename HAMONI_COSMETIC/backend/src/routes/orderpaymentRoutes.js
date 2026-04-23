const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const orderpaymentController = require('../controllers/orderpaymentController');

router.post('/preview', verifyToken, orderpaymentController.getCheckoutPreview);
router.get('/profile', verifyToken, orderpaymentController.getCheckoutProfile);
router.post('/place', verifyToken, orderpaymentController.placeOrderFromCheckout);
router.post('/confirm-online', verifyToken, orderpaymentController.confirmOnlinePayment);
router.get('/status/:orderId', verifyToken, orderpaymentController.getOnlinePaymentStatus);

module.exports = router;
