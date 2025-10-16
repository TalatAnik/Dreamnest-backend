const Joi = require('joi');

const reviewIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid review ID format',
      'any.required': 'Review ID is required'
    })
});

const createReviewSchema = Joi.object({
  targetId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid target ID format',
      'any.required': 'Target ID is required'
    }),

  targetType: Joi.string()
    .valid('PROPERTY', 'SERVICE')
    .required()
    .messages({
      'any.only': 'Target type must be either PROPERTY or SERVICE',
      'any.required': 'Target type is required'
    }),

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating must not exceed 5',
      'number.integer': 'Rating must be a whole number',
      'any.required': 'Rating is required'
    }),

  comment: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Comment must be at least 10 characters long',
      'string.max': 'Comment must not exceed 1000 characters',
      'any.required': 'Comment is required'
    })
});

const updateReviewSchema = Joi.object({
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating must not exceed 5',
      'number.integer': 'Rating must be a whole number'
    }),

  comment: Joi.string()
    .min(10)
    .max(1000)
    .optional()
    .messages({
      'string.min': 'Comment must be at least 10 characters long',
      'string.max': 'Comment must not exceed 1000 characters'
    })
}).or('rating', 'comment').messages({
  'object.missing': 'At least one field (rating or comment) must be provided for update'
});

const reviewQuerySchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Invalid user ID format'
    }),

  propertyId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Invalid property ID format'
    }),

  serviceId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Invalid service ID format'
    }),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional()
    .messages({
      'number.min': 'Page must be at least 1',
      'number.integer': 'Page must be a whole number'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100',
      'number.integer': 'Limit must be a whole number'
    })
});

module.exports = {
  reviewIdSchema,
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema
};