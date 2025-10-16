const Joi = require('joi');

const uploadSchema = Joi.object({
  category: Joi.string()
    .valid('avatar', 'property', 'portfolio', 'document')
    .default('property')
    .optional()
    .messages({
      'any.only': 'Category must be one of: avatar, property, portfolio, document'
    })
});

const fileIdSchema = Joi.object({
  fileId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid file ID format',
      'any.required': 'File ID is required'
    })
});

const userIdSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid user ID format',
      'any.required': 'User ID is required'
    })
});

module.exports = {
  uploadSchema,
  fileIdSchema,
  userIdSchema
};