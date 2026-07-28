const { PrismaClient } = require('@prisma/client');
const {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
  reviewIdSchema
} = require('../validators/reviewValidators');

const prisma = new PrismaClient();

/**
 * Get reviews with filtering
 */
const getReviews = async (req, res) => {
  try {
    const { error, value } = reviewQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { userId, propertyId, serviceId, page = 1, limit = 10 } = value;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (userId) where.authorId = userId;
    if (propertyId) where.propertyId = propertyId;
    if (serviceId) where.serviceId = serviceId;

    // Get reviews with related data
    const reviews = await prisma.review.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        property: {
          select: {
            id: true,
            title: true,
            images: true
          }
        },
        service: {
          select: {
            id: true,
            title: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    // Get total count for pagination
    const total = await prisma.review.count({ where });

    // Calculate average rating
    const ratings = reviews.map(r => r.rating);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    res.json({
      status: 'success',
      data: {
        reviews,
        averageRating: Number(averageRating.toFixed(1)),
        totalReviews: total,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reviews'
    });
  }
};

/**
 * Create a new review
 */
const createReview = async (req, res) => {
  try {
    const { error, value } = createReviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { targetId, targetType, rating, comment } = value;
    const authorId = req.user.id;

    // Validate target exists and user hasn't already reviewed
    let targetExists = false;
    let existingReview = null;
    let targetUserId = null;

    if (targetType === 'PROPERTY') {
      const property = await prisma.property.findUnique({
        where: { id: targetId }
      });
      targetExists = !!property;
      targetUserId = property?.ownerId || null;

      existingReview = await prisma.review.findFirst({
        where: {
          authorId,
          propertyId: targetId
        }
      });
    } else if (targetType === 'SERVICE') {
      const service = await prisma.service.findUnique({
        where: { id: targetId }
      });
      targetExists = !!service;
      targetUserId = service?.providerId || null;

      existingReview = await prisma.review.findFirst({
        where: {
          authorId,
          serviceId: targetId
        }
      });
    }

    if (!targetExists) {
      return res.status(404).json({
        status: 'error',
        message: `${targetType.toLowerCase()} not found`
      });
    }

    if (existingReview) {
      return res.status(409).json({
        status: 'error',
        message: 'You have already reviewed this item'
      });
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        reviewType: targetType,
        authorId,
        targetUserId,
        propertyId: targetType === 'PROPERTY' ? targetId : null,
        serviceId: targetType === 'SERVICE' ? targetId : null
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        property: targetType === 'PROPERTY' ? {
          select: {
            id: true,
            title: true,
            images: true
          }
        } : false,
        service: targetType === 'SERVICE' ? {
          select: {
            id: true,
            title: true,
            images: true
          }
        } : false
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Review created successfully',
      data: { review }
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create review'
    });
  }
};

/**
 * Update a review
 */
const updateReview = async (req, res) => {
  try {
    const { error: idError, value: idValue } = reviewIdSchema.validate(req.params);
    if (idError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid review ID'
      });
    }

    const { error, value } = updateReviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { id } = idValue;
    const { rating, comment } = value;
    const userId = req.user.id;

    // Find review and check ownership
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    if (review.authorId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own reviews'
      });
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        rating,
        comment
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        property: review.propertyId ? {
          select: {
            id: true,
            title: true,
            images: true
          }
        } : false,
        service: review.serviceId ? {
          select: {
            id: true,
            title: true,
            images: true
          }
        } : false
      }
    });

    res.json({
      status: 'success',
      message: 'Review updated successfully',
      data: { review: updatedReview }
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update review'
    });
  }
};

/**
 * Delete a review
 */
const deleteReview = async (req, res) => {
  try {
    const { error, value } = reviewIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid review ID'
      });
    }

    const { id } = value;
    const userId = req.user.id;

    // Find review and check ownership
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    if (review.authorId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own reviews'
      });
    }

    // Delete review
    await prisma.review.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete review'
    });
  }
};

/**
 * Mark review as helpful
 */
const markReviewHelpful = async (req, res) => {
  try {
    const { error, value } = reviewIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid review ID'
      });
    }

    const { id } = value;

    // Check if review exists
    const review = await prisma.review.findUnique({
      where: { id }
    });

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    // For now, just return success (in a real app, you'd track helpful votes)
    // This is a simplified implementation
    res.json({
      status: 'success',
      message: 'Review marked as helpful',
      data: {
        reviewId: id,
        helpful: true
      }
    });

  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark review as helpful'
    });
  }
};

module.exports = {
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful
};