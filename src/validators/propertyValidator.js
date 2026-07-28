const { body, query, param } = require('express-validator');

// Property creation validation
const validateCreateProperty = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Property title is required')
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Property description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 200 })
    .withMessage('Address must not exceed 200 characters'),

  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 50 })
    .withMessage('City must not exceed 50 characters'),

  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ max: 50 })
    .withMessage('State must not exceed 50 characters'),

  body('zipCode')
    .trim()
    .notEmpty()
    .withMessage('ZIP code is required')
    .matches(/^\d{4}$/)
    .withMessage('Please provide a valid 4-digit postal code for Bangladesh'),

  body('country')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Country must not exceed 50 characters'),

  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('propertyType')
    .notEmpty()
    .withMessage('Property type is required')
    .isIn(['APARTMENT', 'HOUSE', 'CONDO', 'VILLA', 'STUDIO', 'LOFT', 'TOWNHOUSE'])
    .withMessage('Invalid property type'),

  body('bedrooms')
    .isInt({ min: 0, max: 20 })
    .withMessage('Bedrooms must be a number between 0 and 20'),

  body('bathrooms')
    .isInt({ min: 1, max: 20 })
    .withMessage('Bathrooms must be a number between 1 and 20'),

  body('area')
    .isFloat({ min: 1 })
    .withMessage('Area must be a positive number'),

  body('maxOccupants')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max occupants must be between 1 and 20'),

  body('monthlyRent')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Monthly rent must be a positive number'),

  body('securityDeposit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Security deposit must be a non-negative number'),

  body('availableFrom')
    .optional()
    .isISO8601()
    .withMessage('Available from date must be a valid date')
    .toDate(),

  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array')
    .custom((amenities) => {
      if (amenities.length > 50) {
        throw new Error('Too many amenities (maximum 50)');
      }
      return amenities.every(amenity => typeof amenity === 'string' && amenity.length <= 50);
    })
    .withMessage('Each amenity must be a string with maximum 50 characters'),

  body('rules')
    .optional()
    .isArray()
    .withMessage('Rules must be an array')
    .custom((rules) => {
      if (rules.length > 20) {
        throw new Error('Too many rules (maximum 20)');
      }
      return rules.every(rule => typeof rule === 'string' && rule.length <= 200);
    })
    .withMessage('Each rule must be a string with maximum 200 characters')
];

// Property update validation (all fields optional)
const validateUpdateProperty = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address must not exceed 200 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City must not exceed 50 characters'),

  body('state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State must not exceed 50 characters'),

  body('zipCode')
    .optional()
    .trim()
    .matches(/^\d{4}$/)
    .withMessage('Please provide a valid 4-digit postal code for Bangladesh'),

  body('country')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Country must not exceed 50 characters'),

  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('propertyType')
    .optional()
    .isIn(['APARTMENT', 'HOUSE', 'CONDO', 'VILLA', 'STUDIO', 'LOFT', 'TOWNHOUSE'])
    .withMessage('Invalid property type'),

  body('bedrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bedrooms must be a number between 0 and 20'),

  body('bathrooms')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Bathrooms must be a number between 1 and 20'),

  body('area')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Area must be a positive number'),

  body('maxOccupants')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Max occupants must be between 1 and 20'),

  body('monthlyRent')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Monthly rent must be a positive number'),

  body('securityDeposit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Security deposit must be a non-negative number'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('availableFrom')
    .optional()
    .isISO8601()
    .withMessage('Available from date must be a valid date')
    .toDate(),

  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array')
    .custom((amenities) => {
      if (amenities.length > 50) {
        throw new Error('Too many amenities (maximum 50)');
      }
      return amenities.every(amenity => typeof amenity === 'string' && amenity.length <= 50);
    })
    .withMessage('Each amenity must be a string with maximum 50 characters'),

  body('rules')
    .optional()
    .isArray()
    .withMessage('Rules must be an array')
    .custom((rules) => {
      if (rules.length > 20) {
        throw new Error('Too many rules (maximum 20)');
      }
      return rules.every(rule => typeof rule === 'string' && rule.length <= 200);
    })
    .withMessage('Each rule must be a string with maximum 200 characters')
];

// Property search/filter validation
const validatePropertySearch = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  query('city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City must not exceed 50 characters'),

  query('state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State must not exceed 50 characters'),

  query('propertyType')
    .optional()
    .isIn(['APARTMENT', 'HOUSE', 'CONDO', 'VILLA', 'STUDIO', 'LOFT', 'TOWNHOUSE'])
    .withMessage('Invalid property type'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a non-negative number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a non-negative number')
    .custom((value, { req }) => {
      if (value && req.query.minPrice && parseFloat(value) < parseFloat(req.query.minPrice)) {
        throw new Error('Maximum price must be greater than minimum price');
      }
      return true;
    }),

  query('bedrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bedrooms must be between 0 and 20'),

  query('bathrooms')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Bathrooms must be between 1 and 20'),

  query('minArea')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Minimum area must be a positive number'),

  query('maxArea')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Maximum area must be a positive number')
    .custom((value, { req }) => {
      if (value && req.query.minArea && parseFloat(value) < parseFloat(req.query.minArea)) {
        throw new Error('Maximum area must be greater than minimum area');
      }
      return true;
    }),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'monthlyRent', 'title', 'area', 'bedrooms'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

// Property inquiry validation
const validatePropertyInquiry = [
  param('id')
    .notEmpty()
    .withMessage('Property ID is required')
    .isString()
    .withMessage('Property ID must be a string'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),

  body('checkInDate')
    .optional()
    .isISO8601()
    .withMessage('Check-in date must be a valid date')
    .toDate()
    .custom((value) => {
      if (value && new Date(value) < new Date()) {
        throw new Error('Check-in date cannot be in the past');
      }
      return true;
    }),

  body('checkOutDate')
    .optional()
    .isISO8601()
    .withMessage('Check-out date must be a valid date')
    .toDate()
    .custom((value, { req }) => {
      if (value && req.body.checkInDate && new Date(value) <= new Date(req.body.checkInDate)) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),

  body('guests')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Number of guests must be between 1 and 50')
];

// Remove image validation
const validateRemoveImage = [
  param('id')
    .notEmpty()
    .withMessage('Property ID is required')
    .isString()
    .withMessage('Property ID must be a string'),

  body('imageUrl')
    .trim()
    .notEmpty()
    .withMessage('Image URL is required')
    .isURL()
    .withMessage('Image URL must be a valid URL')
];

// Property ID parameter validation
const validatePropertyId = [
  param('id')
    .notEmpty()
    .withMessage('Property ID is required')
    .isString()
    .withMessage('Property ID must be a string')
];

module.exports = {
  validateCreateProperty,
  validateUpdateProperty,
  validatePropertySearch,
  validatePropertyInquiry,
  validateRemoveImage,
  validatePropertyId
};