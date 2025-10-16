const express = require('express');
const {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getUserProperties,
  sendPropertyInquiry,
  removePropertyImage,
  getPropertyReviews
} = require('../controllers/propertyController');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/uploadMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const {
  validateCreateProperty,
  validateUpdateProperty,
  validatePropertySearch,
  validatePropertyInquiry,
  validateRemoveImage,
  validatePropertyId
} = require('../validators/propertyValidator');

const router = express.Router();

// Public routes (no authentication required)

// Get all properties with search and filtering
router.get(
  '/',
  validatePropertySearch,
  validateRequest,
  getProperties
);

// Get single property by ID
router.get(
  '/:id',
  validatePropertyId,
  validateRequest,
  getPropertyById
);

// Get reviews for a specific property
router.get(
  '/:id/reviews',
  validatePropertyId,
  validateRequest,
  getPropertyReviews
);

// Protected routes (authentication required)

// Send property inquiry (renters and property owners can inquire)
router.post(
  '/:id/inquiry',
  authenticateToken,
  validatePropertyInquiry,
  validateRequest,
  sendPropertyInquiry
);

// Property owner only routes

// Create new property
router.post(
  '/',
  authenticateToken,
  requireRole('OWNER', 'ADMIN'),
  uploadMultiple('images', 10, 'property'),
  validateCreateProperty,
  validateRequest,
  createProperty
);

// Update property
router.put(
  '/:id',
  authenticateToken,
  requireRole('OWNER', 'ADMIN'),
  uploadMultiple('images', 10, 'property'),
  validatePropertyId,
  validateUpdateProperty,
  validateRequest,
  updateProperty
);

// Delete property
router.delete(
  '/:id',
  authenticateToken,
  requireRole('OWNER', 'ADMIN'),
  validatePropertyId,
  validateRequest,
  deleteProperty
);

// Get user's own properties
router.get(
  '/user/my-properties',
  authenticateToken,
  requireRole('OWNER', 'ADMIN'),
  validatePropertySearch,
  validateRequest,
  getUserProperties
);

// Remove image from property
router.delete(
  '/:id/images',
  authenticateToken,
  requireRole('OWNER', 'ADMIN'),
  validateRemoveImage,
  validateRequest,
  removePropertyImage
);

module.exports = router;