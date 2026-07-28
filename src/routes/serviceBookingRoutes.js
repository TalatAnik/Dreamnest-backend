const express = require('express');
const router = express.Router();

const serviceBookingController = require('../controllers/serviceBookingController');
const serviceValidator = require('../validators/serviceValidator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validateRequest');

// Service Booking Routes

// Create new service booking (Authenticated users)
router.post('/',
  authenticateToken,
  serviceValidator.validateCreateServiceBooking,
  validateRequest,
  serviceBookingController.createServiceBooking
);

// Get user's bookings (both as customer and provider)
router.get('/my-bookings',
  authenticateToken,
  serviceValidator.validateBookingQuery,
  validateRequest,
  serviceBookingController.getUserBookings
);

// Get single booking by ID
router.get('/:id',
  authenticateToken,
  serviceValidator.validateBookingId,
  validateRequest,
  serviceBookingController.getBookingById
);

// Update booking status (Service Provider only)
router.patch('/:id/status',
  authenticateToken,
  requireRole('SERVICE_PROVIDER'),
  serviceValidator.validateBookingId,
  serviceValidator.validateUpdateBookingStatus,
  validateRequest,
  serviceBookingController.updateBookingStatus
);

// Cancel booking (Customer only)
router.patch('/:id/cancel',
  authenticateToken,
  serviceValidator.validateBookingId,
  validateRequest,
  serviceBookingController.cancelBooking
);

module.exports = router;