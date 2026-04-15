const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

router.get('/stats', reviewController.getReviewStats); 
router.get('/', reviewController.getAllReviews);

router.put('/:id/status', reviewController.updateStatus);
router.put('/:id/reply', reviewController.replyReview);


module.exports = router;
