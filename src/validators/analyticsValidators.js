const Joi = require('joi');

const analyticsQuerySchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': 'Invalid ID format',
      'any.required': 'ID is required'
    })
});

module.exports = {
  analyticsQuerySchema
};