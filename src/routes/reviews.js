const express = require('express');
const {
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful
} = require('../controllers/reviewController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All review routes require authentication
router.use(authenticateToken);

// Get reviews with optional filtering
router.get('/', getReviews);

// Create a new review
router.post('/', createReview);

// Update a review (only by author)
router.put('/:id', updateReview);

// Delete a review (only by author)
router.delete('/:id', deleteReview);

// Mark review as helpful
router.post('/:id/helpful', markReviewHelpful);

module.exports = router;