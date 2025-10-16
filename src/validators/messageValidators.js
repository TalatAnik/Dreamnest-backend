const Joi = require('joi');

const sendMessageSchema = Joi.object({
  receiverId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid receiver ID format',
      'any.required': 'Receiver ID is required'
    }),

  content: Joi.string()
    .min(1)
    .max(1000)
    .required()
    .messages({
      'string.min': 'Message content cannot be empty',
      'string.max': 'Message content must not exceed 1000 characters',
      'any.required': 'Message content is required'
    }),

  messageType: Joi.string()
    .valid('DIRECT', 'PROPERTY_INQUIRY', 'SERVICE_INQUIRY', 'BOOKING_UPDATE', 'SYSTEM')
    .default('DIRECT')
    .optional()
    .messages({
      'any.only': 'Invalid message type'
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
    })
}).messages({
  'object.missing': 'Either propertyId or serviceId must be provided for inquiry messages'
});

const messageQuerySchema = Joi.object({
  otherUserId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Invalid user ID format'
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
    .default(20)
    .optional()
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100',
      'number.integer': 'Limit must be a whole number'
    })
});

const messageIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid message ID format',
      'any.required': 'Message ID is required'
    })
});

module.exports = {
  sendMessageSchema,
  messageQuerySchema,
  messageIdSchema
};