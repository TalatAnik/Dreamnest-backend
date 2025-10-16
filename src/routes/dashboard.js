const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getRenterDashboard,
  getOwnerDashboard,
  getProviderDashboard,
  getDashboard
} = require('../controllers/dashboardController');

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// Unified dashboard endpoint - role determined by authenticated user's token
router.get('/', getDashboard);

// Legacy role-specific endpoints (deprecated but kept for backwards compatibility)
router.get('/renter', getRenterDashboard);
router.get('/owner', getOwnerDashboard);
router.get('/provider', getProviderDashboard);

module.exports = router;