const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getRenterDashboard,
  getOwnerDashboard,
  getProviderDashboard
} = require('../controllers/dashboardController');

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticateToken);

// Role-specific dashboard routes
router.get('/renter', requireRole('RENTER'), getRenterDashboard);
router.get('/owner', requireRole('OWNER'), getOwnerDashboard);
router.get('/provider', requireRole('SERVICE_PROVIDER'), getProviderDashboard);

module.exports = router;