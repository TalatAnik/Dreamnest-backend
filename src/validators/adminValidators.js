const Joi = require('joi');

const adminQuerySchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid ID format',
      'any.required': 'ID is required'
    })
});

const adminUserQuerySchema = Joi.object({
  role: Joi.string()
    .valid('RENTER', 'OWNER', 'SERVICE_PROVIDER', 'ADMIN')
    .optional()
    .messages({
      'any.only': 'Invalid role'
    }),

  status: Joi.string()
    .valid('ACTIVE', 'SUSPENDED')
    .optional()
    .messages({
      'any.only': 'Invalid status'
    }),

  search: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query must not exceed 100 characters'
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

const adminUserUpdateSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 50 characters'
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 50 characters'
    }),

  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Please enter a valid email address'
    }),

  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please enter a valid phone number'
    }),

  role: Joi.string()
    .valid('RENTER', 'OWNER', 'SERVICE_PROVIDER', 'ADMIN')
    .optional()
    .messages({
      'any.only': 'Invalid role'
    }),

  status: Joi.string()
    .valid('ACTIVE', 'SUSPENDED')
    .optional()
    .messages({
      'any.only': 'Invalid status'
    }),

  avatar: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Avatar must be a valid URL'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

const adminPropertyModerateSchema = Joi.object({
  status: Joi.string()
    .valid('APPROVED', 'PENDING')
    .required()
    .messages({
      'any.only': 'Status must be APPROVED or PENDING',
      'any.required': 'Status is required'
    })
});

const adminReviewModerateSchema = Joi.object({
  action: Joi.string()
    .valid('approve', 'reject', 'hide')
    .required()
    .messages({
      'any.only': 'Action must be approve, reject, or hide',
      'any.required': 'Action is required'
    })
});

module.exports = {
  adminQuerySchema,
  adminUserQuerySchema,
  adminUserUpdateSchema,
  adminPropertyModerateSchema,
  adminReviewModerateSchema
};