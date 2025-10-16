const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const {
  getAdminDashboard,
  getAllUsers,
  updateUser,
  deleteUser,
  getAllProperties,
  moderateProperty,
  getAllServices,
  getAllBookings,
  getAllReviews,
  moderateReview
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// Dashboard
router.get('/dashboard', getAdminDashboard);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Property management
router.get('/properties', getAllProperties);
router.put('/properties/:id', moderateProperty);

// Service management
router.get('/services', getAllServices);

// Booking management
router.get('/bookings', getAllBookings);

// Review management
router.get('/reviews', getAllReviews);
router.put('/reviews/:id/moderate', moderateReview);

module.exports = router;