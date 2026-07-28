const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get renter dashboard data
 */
const getRenterDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get saved/favorite properties
    const savedProperties = await prisma.property.findMany({
      where: {
        isActive: true,
        // Note: In a real app, you'd have a favorites/bookmarks table
        // For now, we'll return recent properties as an example
      },
      select: {
        id: true,
        title: true,
        monthlyRent: true,
        images: true,
        city: true,
        state: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    // Get recent bookings
    const recentBookings = await prisma.serviceBooking.findMany({
      where: { bookerId: userId },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            images: true,
            provider: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        payment: {
          select: {
            amount: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get recent searches (mock data - in real app, you'd track this)
    const recentSearches = [
      { query: '2 bedroom apartment', location: 'Dhaka', timestamp: new Date() },
      { query: 'cleaning service', location: 'Dhaka', timestamp: new Date() }
    ];

    // Get pending reviews
    const pendingReviews = await prisma.serviceBooking.findMany({
      where: {
        bookerId: userId,
        status: 'COMPLETED'
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            images: true
          }
        }
      },
      take: 5
    });

    // Filter out bookings that already have reviews
    const reviewedBookingIds = await prisma.review.findMany({
      where: {
        authorId: userId,
        serviceId: { not: null }
      },
      select: { serviceId: true }
    });

    const reviewedServiceIds = reviewedBookingIds.map(r => r.serviceId);
    const pendingReviewsFiltered = pendingReviews.filter(
      booking => !reviewedServiceIds.includes(booking.serviceId)
    );

    res.json({
      status: 'success',
      data: {
        savedProperties,
        bookingHistory: recentBookings,
        recentSearches,
        pendingReviews: pendingReviewsFiltered
      }
    });

  } catch (error) {
    console.error('Get renter dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch renter dashboard'
    });
  }
};

/**
 * Get owner dashboard data
 */
const getOwnerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get owner's properties
    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        title: true,
        isActive: true,
        monthlyRent: true,
        images: true,
        createdAt: true,
        _count: {
          select: {
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get recent bookings for owner's properties
    const bookings = await prisma.serviceBooking.findMany({
      where: {
        service: {
          providerId: userId
        }
      },
      include: {
        service: {
          select: {
            id: true,
            title: true
          }
        },
        booker: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        payment: {
          select: {
            amount: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get tenants (simplified - in real app, this would be from lease applications)
    const tenants = await prisma.serviceBooking.findMany({
      where: {
        service: {
          providerId: userId
        },
        status: 'COMPLETED'
      },
      include: {
        booker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      distinct: ['bookerId'],
      take: 10
    });

    // Calculate analytics
    const totalProperties = properties.length;
    const activeProperties = properties.filter(p => p.isActive === true).length;
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;

    // Calculate earnings
    const earnings = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        serviceBooking: {
          service: {
            providerId: userId
          }
        }
      },
      _sum: { amount: true }
    });

    res.json({
      status: 'success',
      data: {
        properties,
        bookings,
        tenants: tenants.map(t => t.booker),
        analytics: {
          totalProperties,
          activeProperties,
          totalBookings,
          completedBookings,
          totalEarnings: earnings._sum.amount || 0
        }
      }
    });

  } catch (error) {
    console.error('Get owner dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch owner dashboard'
    });
  }
};

/**
 * Get service provider dashboard data
 */
const getProviderDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get provider's services
    const services = await prisma.service.findMany({
      where: { providerId: userId },
      select: {
        id: true,
        title: true,
        isActive: true,
        price: true,
        category: true,
        images: true,
        createdAt: true,
        _count: {
          select: {
            reviews: true,
            bookings: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get upcoming bookings
    const upcomingBookings = await prisma.serviceBooking.findMany({
      where: {
        service: {
          providerId: userId
        },
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledDate: {
          gte: new Date()
        }
      },
      include: {
        service: {
          select: {
            id: true,
            title: true
          }
        },
        booker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10
    });

    // Get recent bookings
    const recentBookings = await prisma.serviceBooking.findMany({
      where: {
        service: {
          providerId: userId
        }
      },
      include: {
        service: {
          select: {
            id: true,
            title: true
          }
        },
        booker: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        payment: {
          select: {
            amount: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate earnings
    const earnings = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        serviceBooking: {
          service: {
            providerId: userId
          }
        }
      },
      _sum: { amount: true },
      _count: true
    });

    // Get earnings by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyEarnings = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', p."createdAt") as month,
        SUM(p.amount) as earnings
      FROM payments p
      JOIN service_bookings sb ON p."serviceBookingId" = sb.id
      JOIN services s ON sb."serviceId" = s.id
      WHERE p.status = 'COMPLETED'
        AND s."providerId" = ${userId}
        AND p."createdAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', p."createdAt")
      ORDER BY month DESC
    `;

    res.json({
      status: 'success',
      data: {
        services,
        upcomingBookings,
        recentBookings,
        earnings: {
          total: earnings._sum.amount || 0,
          totalBookings: earnings._count,
          monthly: monthlyEarnings
        }
      }
    });

  } catch (error) {
    console.error('Get provider dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch provider dashboard'
    });
  }
};

/**
 * Unified dashboard endpoint - role determined by authenticated user's token
 * This is the secure way to fetch dashboard data - role is derived from JWT, not frontend input
 */
const getDashboard = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Route to appropriate dashboard based on authenticated user's role
    if (userRole === 'RENTER') {
      return getRenterDashboard(req, res);
    } else if (userRole === 'OWNER') {
      return getOwnerDashboard(req, res);
    } else if (userRole === 'SERVICE_PROVIDER') {
      return getProviderDashboard(req, res);
    } else if (userRole === 'ADMIN') {
      // For admin, return a generic dashboard or admin-specific one
      return res.json({
        status: 'success',
        data: {
          role: 'ADMIN',
          message: 'Admin dashboard - implement as needed'
        }
      });
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Unknown user role'
      });
    }
  } catch (error) {
    console.error('Get unified dashboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard'
    });
  }
};

module.exports = {
  getDashboard,
  getRenterDashboard,
  getOwnerDashboard,
  getProviderDashboard
};