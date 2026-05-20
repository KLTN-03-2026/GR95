const express = require("express");
const router = express.Router();

const productreviewController = require("../controllers/productreviewController");
const uploadCloud = require("../config/cloudinaryConfig");

// CHECK LỊCH SỬ ĐÁNH GIÁ
// GET /api/product-reviews/check-history?MaDH=46&MaSP=43&MaND=12
router.get("/check-history", productreviewController.checkReviewHistory);

// TẠO ĐÁNH GIÁ
// POST /api/product-reviews/create
router.post(
  "/create",
  function (req, res, next) {
    const upload = uploadCloud.array("HinhAnh", 10);

    upload(req, res, function (err) {
      if (err) {
        console.error("🔥 LỖI TỪ CLOUDINARY/MULTER:");
        console.dir(err, { depth: null });

        return res.status(500).json({
          success: false,
          message:
            "Lỗi tải ảnh/video lên mây: " +
            (err.message || JSON.stringify(err)),
        });
      }

      next();
    });
  },
  productreviewController.createReview,
);

module.exports = router;
