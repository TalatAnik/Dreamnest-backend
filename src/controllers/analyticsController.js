const { PrismaClient } = require('@prisma/client');
const { analyticsQuerySchema } = require('../validators/analyticsValidators');

const prisma = new PrismaClient();

/**
 * Get property analytics
 */
const getPropertyAnalytics = async (req, res) => {
  try {
    const { error, value } = analyticsQuerySchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { id: propertyId } = value;
    const userId = req.user.id;

    // Check if user owns the property
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        ownerId: userId
      }
    });

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found or access denied'
      });
    }

    // Get view statistics (mock data - in real app, you'd track views)
    const views = {
      total: Math.floor(Math.random() * 1000) + 100,
      thisMonth: Math.floor(Math.random() * 200) + 20,
      lastMonth: Math.floor(Math.random() * 150) + 15
    };

    // Get review statistics
    const reviews = await prisma.review.findMany({
      where: { propertyId },
      select: {
        rating: true,
        createdAt: true
      }
    });

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    // Get top inquiry sources (mock data)
    const topSources = [
      { source: 'Search Engine', count: Math.floor(Math.random() * 50) + 10 },
      { source: 'Social Media', count: Math.floor(Math.random() * 30) + 5 },
      { source: 'Direct', count: Math.floor(Math.random() * 20) + 3 }
    ];

    res.json({
      status: 'success',
      data: {
        property: {
          id: property.id,
          title: property.title
        },
        views,
        reviews: {
          total: reviews.length,
          averageRating: Number(averageRating.toFixed(1)),
          distribution: {
            5: reviews.filter(r => r.rating === 5).length,
            4: reviews.filter(r => r.rating === 4).length,
            3: reviews.filter(r => r.rating === 3).length,
            2: reviews.filter(r => r.rating === 2).length,
            1: reviews.filter(r => r.rating === 1).length
          }
        },
        topSources
      }
    });

  } catch (error) {
    console.error('Get property analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch property analytics'
    });
  }
};

/**
 * Get service analytics
 */
const getServiceAnalytics = async (req, res) => {
  try {
    const { error, value } = analyticsQuerySchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { id: serviceId } = value;
    const userId = req.user.id;

    // Check if user provides the service
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        providerId: userId
      }
    });

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found or access denied'
      });
    }

    // Get view statistics (mock data)
    const views = {
      total: Math.floor(Math.random() * 800) + 50,
      thisMonth: Math.floor(Math.random() * 150) + 10,
      lastMonth: Math.floor(Math.random() * 120) + 8
    };

    // Get booking statistics
    const bookings = await prisma.serviceBooking.findMany({
      where: { serviceId },
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        createdAt: true,
        payment: {
          select: {
            amount: true,
            status: true
          }
        }
      }
    });

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;
    const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
    const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length;

    // Calculate revenue
    const revenue = bookings
      .filter(b => b.payment?.status === 'COMPLETED')
      .reduce((sum, b) => sum + (b.payment?.amount || 0), 0);

    // Get review statistics
    const reviews = await prisma.review.findMany({
      where: { serviceId },
      select: {
        rating: true,
        createdAt: true
      }
    });

    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    // Get monthly booking statistics (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyBookings = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "createdAt") as month,
        COUNT(*) as bookings,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
      FROM service_bookings
      WHERE "serviceId" = ${serviceId}
        AND "createdAt" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
    `;

    // Get monthly revenue statistics
    const monthlyRevenue = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', sb."createdAt") as month,
        SUM(p.amount) as revenue
      FROM service_bookings sb
      JOIN payments p ON sb.id = p."serviceBookingId"
      WHERE sb."serviceId" = ${serviceId}
        AND p.status = 'COMPLETED'
        AND sb."createdAt" >= ${twelveMonthsAgo}
      GROUP BY DATE_TRUNC('month', sb."createdAt")
      ORDER BY month DESC
    `;

    // Get top clients (by booking frequency)
    const topClients = await prisma.$queryRaw`
      SELECT
        u."firstName",
        u."lastName",
        u.email,
        COUNT(sb.id) as booking_count
      FROM service_bookings sb
      JOIN users u ON sb."bookerId" = u.id
      WHERE sb."serviceId" = ${serviceId}
      GROUP BY u.id, u."firstName", u."lastName", u.email
      ORDER BY booking_count DESC
      LIMIT 5
    `;

    res.json({
      status: 'success',
      data: {
        service: {
          id: service.id,
          title: service.title,
          category: service.category
        },
        views,
        bookings: {
          total: totalBookings,
          completed: completedBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          monthly: monthlyBookings
        },
        revenue: {
          total: revenue,
          monthly: monthlyRevenue
        },
        reviews: {
          total: reviews.length,
          averageRating: Number(averageRating.toFixed(1)),
          distribution: {
            5: reviews.filter(r => r.rating === 5).length,
            4: reviews.filter(r => r.rating === 4).length,
            3: reviews.filter(r => r.rating === 3).length,
            2: reviews.filter(r => r.rating === 2).length,
            1: reviews.filter(r => r.rating === 1).length
          }
        },
        topClients
      }
    });

  } catch (error) {
    console.error('Get service analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service analytics'
    });
  }
};

module.exports = {
  getPropertyAnalytics,
  getServiceAnalytics
};