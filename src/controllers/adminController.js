const { PrismaClient } = require('@prisma/client');
const {
  adminUserQuerySchema,
  adminUserUpdateSchema,
  adminPropertyModerateSchema,
  adminReviewModerateSchema,
  adminQuerySchema
} = require('../validators/adminValidators');

const prisma = new PrismaClient();

/**
 * Get admin dashboard statistics
 */
const getAdminDashboard = async (req, res) => {
  try {
    // Get counts
    const [
      totalUsers,
      totalProperties,
      totalServices,
      totalBookings,
      totalReviews,
      totalRevenue
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.service.count(),
      prisma.serviceBooking.count(),
      prisma.review.count(),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' }
      })
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.property.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.service.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.serviceBooking.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
    ]);

    // Get pending moderations
    const pendingProperties = await prisma.property.count({
      where: { isActive: false }
    });

    const pendingReviews = await prisma.review.count({
      where: { isActive: false }
    });

    res.json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          totalProperties,
          totalServices,
          totalBookings,
          totalReviews,
          totalRevenue: totalRevenue._sum.amount || 0,
          recentActivity: {
            newUsers: recentActivity[0],
            newProperties: recentActivity[1],
            newServices: recentActivity[2],
            newBookings: recentActivity[3]
          },
          pendingModeration: {
            properties: pendingProperties,
            reviews: pendingReviews
          }
        }
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard data'
    });
  }
};

/**
 * Get all users for admin management
 */
const getAllUsers = async (req, res) => {
  try {
    const { error, value } = adminUserQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { role, status, search, page = 1, limit = 10 } = value;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {};
    if (role) where.role = role;
    if (status) where.isActive = status === 'ACTIVE';
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get users with related data
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ownedProperties: true,
            services: true,
            serviceBookings: true,
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    // Get total count
    const total = await prisma.user.count({ where });

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users'
    });
  }
};

/**
 * Update user by admin
 */
const updateUser = async (req, res) => {
  try {
    const { error: idError, value: idValue } = adminQuerySchema.validate(req.params);
    if (idError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID'
      });
    }

    const { error, value } = adminUserUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { id } = idValue;
    const updateData = value;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      status: 'success',
      message: 'User updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user'
    });
  }
};

/**
 * Delete user by admin
 */
const deleteUser = async (req, res) => {
  try {
    const { error, value } = adminQuerySchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID'
      });
    }

    const { id } = value;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user'
    });
  }
};

/**
 * Get all properties for admin management
 */
const getAllProperties = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const properties = await prisma.property.findMany({
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            reviews: true,
            serviceBookings: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.property.count();

    res.json({
      status: 'success',
      data: {
        properties,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all properties error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch properties'
    });
  }
};

/**
 * Moderate property status
 */
const moderateProperty = async (req, res) => {
  try {
    const { error: idError, value: idValue } = adminQuerySchema.validate(req.params);
    if (idError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid property ID'
      });
    }

    const { error, value } = adminPropertyModerateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { id } = idValue;
    const { status } = value;

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id }
    });

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    // Update property status
    const updatedProperty = await prisma.property.update({
      where: { id },
      data: { isActive: status === 'APPROVED' },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      message: 'Property status updated successfully',
      data: { property: updatedProperty }
    });

  } catch (error) {
    console.error('Moderate property error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to moderate property'
    });
  }
};

/**
 * Get all services for admin management
 */
const getAllServices = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const services = await prisma.service.findMany({
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            reviews: true,
            serviceBookings: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.service.count();

    res.json({
      status: 'success',
      data: {
        services,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch services'
    });
  }
};

/**
 * Get all bookings for admin management
 */
const getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const bookings = await prisma.serviceBooking.findMany({
      include: {
        booker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            title: true,
            provider: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        payment: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.serviceBooking.count();

    res.json({
      status: 'success',
      data: {
        bookings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch bookings'
    });
  }
};

/**
 * Get all reviews for admin moderation
 */
const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const reviews = await prisma.review.findMany({
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        property: {
          select: {
            id: true,
            title: true
          }
        },
        service: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.review.count();

    res.json({
      status: 'success',
      data: {
        reviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reviews'
    });
  }
};

/**
 * Moderate review
 */
const moderateReview = async (req, res) => {
  try {
    const { error: idError, value: idValue } = adminQuerySchema.validate(req.params);
    if (idError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid review ID'
      });
    }

    const { error, value } = adminReviewModerateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { id } = idValue;
    const { action } = value;

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

    // Determine status based on action
    let isActive;
    switch (action) {
      case 'approve':
      case 'reject':
        isActive = true;
        break;
      case 'hide':
        isActive = false;
        break;
      default:
        return res.status(400).json({
          status: 'error',
          message: 'Invalid action'
        });
    }

    // Update review status
    const updatedReview = await prisma.review.update({
      where: { id },
      data: { isActive },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        property: {
          select: {
            id: true,
            title: true
          }
        },
        service: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      message: 'Review moderated successfully',
      data: { review: updatedReview }
    });

  } catch (error) {
    console.error('Moderate review error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to moderate review'
    });
  }
};

module.exports = {
  getAdminDashboard,
  getAllUsers,
  updateUser,
  deleteUser,
  getAllProperties,
  moderateProperty,
  getAllServices,
  getAllBookings,
  getAllReviews,
  moderateReview
};