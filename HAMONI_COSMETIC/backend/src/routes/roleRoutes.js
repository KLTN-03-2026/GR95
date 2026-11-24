// src/routes/roleRoutes.js
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { requireRole } = require('../middlewares/authMiddleware');

// Khai báo 3 đường dẫn API tương ứng với axios trong roleApi.js ở Frontend
router.get('/', roleController.getRoleAndPermissions);
router.get('/:maQuyen/permissions', roleController.getPermissionsByRole);
router.post('/:maQuyen/permissions', requireRole('ADMIN'), roleController.updateRolePermissions);

module.exports = router;
