const Joi = require('joi');

const globalSearchSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query must not exceed 100 characters',
      'any.required': 'Search query is required'
    }),

  type: Joi.string()
    .valid('properties', 'services', 'users')
    .optional()
    .messages({
      'any.only': 'Type must be one of: properties, services, users'
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
    .max(50)
    .default(10)
    .optional()
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 50',
      'number.integer': 'Limit must be a whole number'
    })
});

const searchSuggestionsSchema = Joi.object({
  q: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Search query must be at least 1 character',
      'string.max': 'Search query must not exceed 100 characters',
      'any.required': 'Search query is required'
    })
});

module.exports = {
  globalSearchSchema,
  searchSuggestionsSchema
};