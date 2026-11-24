const express = require("express");
const router = express.Router();

// Trỏ đến file controller của bạn
const categoryController = require("../controllers/categoryController");
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const staffOnly = [verifyToken, requireRole('ADMIN', 'STAFF')];

// Lưu ý: Route /export phải đặt TRƯỚC route /:id để tránh bị nhầm lẫn tham số
router.get("/export", staffOnly, categoryController.exportCategoryExcel);

router.get("/", categoryController.getAllCategories);
router.post("/", staffOnly, categoryController.createCategory);
router.put("/:id", staffOnly, categoryController.updateCategory);
router.delete("/:id", staffOnly, categoryController.deleteCategory);

module.exports = router;
