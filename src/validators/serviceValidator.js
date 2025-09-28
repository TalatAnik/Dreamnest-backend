const { body, query, param } = require('express-validator');

// Service creation validation
const validateCreateService = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Service name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Service name must be between 3 and 100 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Service description is required')
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),

  body('category')
    .notEmpty()
    .withMessage('Service category is required')
    .isIn(['CLEANING', 'MAINTENANCE', 'SECURITY', 'CONCIERGE', 'TRANSPORTATION', 'CATERING', 'OTHER'])
    .withMessage('Invalid service category'),

  body('price')
    .isFloat({ min: 1 })
    .withMessage('Price must be a positive number'),

  body('duration')
    .isInt({ min: 30, max: 480 })
    .withMessage('Duration must be between 30 minutes and 8 hours (480 minutes)'),

  body('location')
    .trim()
    .notEmpty()
    .withMessage('Service location is required')
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters'),

  body('serviceArea')
    .optional()
    .isArray()
    .withMessage('Service area must be an array')
    .custom((areas) => {
      if (areas.length > 20) {
        throw new Error('Too many service areas (maximum 20)');
      }
      return areas.every(area => typeof area === 'string' && area.length <= 50);
    })
    .withMessage('Each service area must be a string with maximum 50 characters'),

  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array')
    .custom((requirements) => {
      if (requirements.length > 20) {
        throw new Error('Too many requirements (maximum 20)');
      }
      return requirements.every(req => typeof req === 'string' && req.length <= 200);
    })
    .withMessage('Each requirement must be a string with maximum 200 characters')
];

// Service update validation (all fields optional)
const validateUpdateService = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Service name must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Description must be between 20 and 1000 characters'),

  body('category')
    .optional()
    .isIn(['CLEANING', 'MAINTENANCE', 'SECURITY', 'CONCIERGE', 'TRANSPORTATION', 'CATERING', 'OTHER'])
    .withMessage('Invalid service category'),

  body('price')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Price must be a positive number'),

  body('duration')
    .optional()
    .isInt({ min: 30, max: 480 })
    .withMessage('Duration must be between 30 minutes and 8 hours (480 minutes)'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters'),

  body('serviceArea')
    .optional()
    .isArray()
    .withMessage('Service area must be an array')
    .custom((areas) => {
      if (areas.length > 20) {
        throw new Error('Too many service areas (maximum 20)');
      }
      return areas.every(area => typeof area === 'string' && area.length <= 50);
    })
    .withMessage('Each service area must be a string with maximum 50 characters'),

  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array')
    .custom((requirements) => {
      if (requirements.length > 20) {
        throw new Error('Too many requirements (maximum 20)');
      }
      return requirements.every(req => typeof req === 'string' && req.length <= 200);
    })
    .withMessage('Each requirement must be a string with maximum 200 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

// Service search and filtering validation
const validateServiceQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  query('category')
    .optional()
    .isIn(['CLEANING', 'MAINTENANCE', 'SECURITY', 'CONCIERGE', 'TRANSPORTATION', 'CATERING', 'OTHER'])
    .withMessage('Invalid service category'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a non-negative number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a non-negative number')
    .custom((value, { req }) => {
      if (req.query.minPrice && parseFloat(value) < parseFloat(req.query.minPrice)) {
        throw new Error('Maximum price must be greater than minimum price');
      }
      return true;
    }),

  query('location')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Location must be between 1 and 100 characters'),

  query('serviceArea')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') return true;
      if (Array.isArray(value)) {
        return value.every(area => typeof area === 'string' && area.length <= 50);
      }
      return false;
    })
    .withMessage('Service area must be a string or array of strings'),

  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'createdAt', 'category'])
    .withMessage('Sort by must be one of: name, price, createdAt, category'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc')
];

// Service booking creation validation
const validateCreateServiceBooking = [
  body('serviceId')
    .notEmpty()
    .withMessage('Service ID is required')
    .isString()
    .withMessage('Service ID must be a string'),

  body('scheduledDate')
    .isISO8601()
    .withMessage('Scheduled date must be a valid date')
    .toDate()
    .custom((value) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (value < today) {
        throw new Error('Scheduled date cannot be in the past');
      }
      
      // Check if date is not more than 3 months in future
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 3);
      
      if (value > maxDate) {
        throw new Error('Scheduled date cannot be more than 3 months in the future');
      }
      
      return true;
    }),

  body('scheduledTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Scheduled time must be in HH:MM format')
    .custom((time) => {
      const [hours, minutes] = time.split(':').map(Number);
      if (hours < 6 || hours > 22) {
        throw new Error('Service can only be scheduled between 6:00 AM and 10:00 PM');
      }
      return true;
    }),

  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special requests must not exceed 500 characters'),

  body('isUrgent')
    .optional()
    .isBoolean()
    .withMessage('isUrgent must be a boolean')
];

// Booking status update validation
const validateUpdateBookingStatus = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'IN_PROGRESS'])
    .withMessage('Invalid booking status')
];

// Booking query validation
const validateBookingQuery = [
  query('type')
    .optional()
    .isIn(['all', 'customer', 'provider'])
    .withMessage('Type must be one of: all, customer, provider'),

  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'in_progress'])
    .withMessage('Invalid booking status'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// Parameter validation for IDs
const validateServiceId = [
  param('id')
    .notEmpty()
    .withMessage('Service ID is required')
    .isString()
    .withMessage('Service ID must be a string')
];

const validateBookingId = [
  param('id')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isString()
    .withMessage('Booking ID must be a string')
];

const validateProviderId = [
  param('providerId')
    .notEmpty()
    .withMessage('Provider ID is required')
    .isString()
    .withMessage('Provider ID must be a string')
];

module.exports = {
  validateCreateService,
  validateUpdateService,
  validateServiceQuery,
  validateCreateServiceBooking,
  validateUpdateBookingStatus,
  validateBookingQuery,
  validateServiceId,
  validateBookingId,
  validateProviderId
};