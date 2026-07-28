const express = require('express');
const router = express.Router();

const serviceController = require('../controllers/serviceController');
const serviceValidator = require('../validators/serviceValidator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const { validateRequest } = require('../middleware/validateRequest');

// Service Management Routes

// Create new service (Service Providers only)
router.post('/',
  authenticateToken,
  requireRole('SERVICE_PROVIDER'),
  upload.array('images', 10), // Allow up to 10 portfolio images
  handleMulterError,
  serviceValidator.validateCreateService,
  validateRequest,
  serviceController.createService
);

// Get all services with search and filtering
router.get('/',
  serviceValidator.validateServiceQuery,
  validateRequest,
  serviceController.getServices
);

// Get service categories
router.get('/categories',
  serviceController.getServiceCategories
);

// Get featured service providers
router.get('/featured',
  serviceController.getFeaturedProviders
);

// Get services by provider ID
router.get('/provider/:providerId',
  serviceValidator.validateProviderId,
  validateRequest,
  serviceController.getServicesByProvider
);

// Get reviews for all services by a provider
router.get('/providers/:providerId/reviews',
  serviceValidator.validateProviderId,
  validateRequest,
  serviceController.getProviderReviews
);

// Get provider profile with services and reviews
router.get('/providers/:providerId/profile',
  serviceValidator.validateProviderId,
  validateRequest,
  serviceController.getProviderProfile
);

// Get single service by ID
router.get('/:id',
  serviceValidator.validateServiceId,
  validateRequest,
  serviceController.getServiceById
);

// Update service (Service Provider only - own services)
router.put('/:id',
  authenticateToken,
  requireRole('SERVICE_PROVIDER'),
  serviceValidator.validateServiceId,
  upload.array('images', 10), // Allow adding more portfolio images
  handleMulterError,
  serviceValidator.validateUpdateService,
  validateRequest,
  serviceController.updateService
);

// Delete service (Service Provider only - own services)
router.delete('/:id',
  authenticateToken,
  requireRole('SERVICE_PROVIDER'),
  serviceValidator.validateServiceId,
  validateRequest,
  serviceController.deleteService
);

module.exports = router;