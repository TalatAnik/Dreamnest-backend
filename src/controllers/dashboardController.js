const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get renter dashboard data
 */
const getRenterDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get saved/favorite properties
    const savedProperties = await prisma.property.findMany({
      where: {
        status: 'APPROVED',
        // Note: In a real app, you'd have a favorites/bookmarks table
        // For now, we'll return recent properties as an example
      },
      select: {
        id: true,
        title: true,
        price: true,
        images: true,
        city: true,
        state: true
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });

    // Get recent bookings
    const recentBookings = await prisma.serviceBooking.findMany({
      where: { renterId: userId },
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
        renterId: userId,
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
        recentBookings,
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
    const userId = req.user.userId;

    // Get owner's properties
    const properties = await prisma.property.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        title: true,
        status: true,
        price: true,
        images: true,
        createdAt: true,
        _count: {
          select: {
            reviews: true,
            serviceBookings: true
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
        renter: {
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
        renter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      distinct: ['renterId'],
      take: 10
    });

    // Calculate analytics
    const totalProperties = properties.length;
    const activeProperties = properties.filter(p => p.status === 'APPROVED').length;
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;

    // Calculate earnings
    const earnings = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        booking: {
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
        tenants: tenants.map(t => t.renter),
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
    const userId = req.user.userId;

    // Get provider's services
    const services = await prisma.service.findMany({
      where: { providerId: userId },
      select: {
        id: true,
        title: true,
        status: true,
        price: true,
        category: true,
        images: true,
        createdAt: true,
        _count: {
          select: {
            reviews: true,
            serviceBookings: true
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
        renter: {
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
        renter: {
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
        booking: {
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
      JOIN service_bookings sb ON p."bookingId" = sb.id
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

module.exports = {
  getRenterDashboard,
  getOwnerDashboard,
  getProviderDashboard
};