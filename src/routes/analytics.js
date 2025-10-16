const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getPropertyAnalytics,
  getServiceAnalytics
} = require('../controllers/analyticsController');

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

// Property analytics (owner only)
router.get('/properties/:id', requireRole('OWNER'), getPropertyAnalytics);

// Service analytics (service provider only)
router.get('/services/:id', requireRole('SERVICE_PROVIDER'), getServiceAnalytics);

module.exports = router;