const express = require('express');
const router = express.Router();
const orderDetailsController = require('../controllers/OrderDetailsControllers');
const db = require('../config/db');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.use('/:id', async (req, res, next) => {
  if (req.user.role === 'ADMIN' || req.user.role === 'STAFF') return next();
  try {
    const [[order]] = await db.execute('SELECT MaND FROM DonHang WHERE MaDH = ?', [req.params.id]);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (String(order.MaND) !== String(req.user.id)) return res.status(403).json({ message: 'Không có quyền xem đơn hàng' });
    next();
  } catch (error) { next(error); }
});

// GET /api/orderdetails/:id -> order detail
router.get('/:id', orderDetailsController.getOrderDetail);

// GET /api/orderdetails/:id/logs -> order logs
router.get('/:id/logs', orderDetailsController.getOrderLogs);

module.exports = router;
