const express = require('express');
const reviewController = require('../controllers/reviewController');
const { requireLogin, requireRole } = require('../middleware/auth');

const router = express.Router();

// Reviews dashboard (Client submits & views history; Lawyer views ratings & received reviews)
router.get('/', requireRole('client', 'lawyer'), reviewController.getReviewsOverview);

// Submit review (Client only, 1 per case)
router.post('/', requireRole('client'), reviewController.submitReview);

// Public / lawyer reviews by lawyer id
router.get('/lawyers/:lawyerId', requireLogin, reviewController.getLawyerReviews);

module.exports = router;
