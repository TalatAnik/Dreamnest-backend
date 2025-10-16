const { PrismaClient } = require('@prisma/client');
const emailService = require('../utils/emailService');

const prisma = new PrismaClient();

// Create new service (Service Providers only)
const createService = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      duration, // in minutes
      location,
      serviceArea = [],
      requirements = []
    } = req.body;

    // Verify user is a service provider
    if (req.user.role !== 'service_provider') {
      return res.status(403).json({
        status: 'error',
        message: 'Only service providers can create services'
      });
    }

    // Get images from uploaded files (portfolio images)
    const images = req.files ? req.files.map(file => file.path.replace(/\\/g, '/')) : [];

    const service = await prisma.service.create({
      data: {
        name,
        description,
        category,
        price: parseFloat(price),
        duration: parseInt(duration),
        location,
        serviceArea,
        requirements,
        images,
        providerId: req.user.id
      },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Service created successfully',
      data: { service }
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all services with search and filtering
const getServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      location,
      minPrice,
      maxPrice,
      serviceArea,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(category && { category }),
      ...(location && { location: { contains: location, mode: 'insensitive' } }),
      ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
      ...(serviceArea && {
        serviceArea: {
          hasSome: Array.isArray(serviceArea) ? serviceArea : [serviceArea]
        }
      })
    };

    // Build orderBy clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder.toLowerCase();

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          reviews: {
            select: {
              rating: true
            }
          }
        },
        orderBy,
        skip,
        take
      }),
      prisma.service.count({ where })
    ]);

    // Calculate average rating for each service
    const servicesWithRating = services.map(service => {
      const avgRating = service.reviews.length > 0
        ? service.reviews.reduce((sum, review) => sum + review.rating, 0) / service.reviews.length
        : 0;
      
      // Transform to match frontend expectations
      return {
        id: service.id,
        name: service.name,
        category: service.category,
        description: service.description,
        price: service.price,
        duration: `${Math.floor(service.duration / 60)}-${Math.ceil(service.duration / 60)} hours`,
        includes: service.requirements, // Map requirements to includes for frontend
        location: service.location,
        serviceArea: service.serviceArea,
        image: service.images[0] || null, // Primary image
        images: service.images,
        rating: Math.round(avgRating * 10) / 10,
        totalReviews: service.reviews.length,
        provider: service.provider,
        createdAt: service.createdAt
      };
    });

    const totalPages = Math.ceil(total / take);

    res.status(200).json({
      status: 'success',
      data: {
        services: servicesWithRating,
        pagination: {
          page: parseInt(page),
          limit: take,
          total,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single service by ID
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
            createdAt: true
          }
        },
        reviews: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          where: {
            reviewType: 'SERVICE'
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    // Calculate average rating
    const avgRating = service.reviews.length > 0
      ? service.reviews.reduce((sum, review) => sum + review.rating, 0) / service.reviews.length
      : 0;

    // Transform to match frontend expectations
    const transformedService = {
      id: service.id,
      name: service.name,
      category: service.category,
      description: service.description,
      price: service.price,
      duration: `${Math.floor(service.duration / 60)}-${Math.ceil(service.duration / 60)} hours`,
      includes: service.requirements,
      location: service.location,
      serviceArea: service.serviceArea,
      images: service.images,
      rating: Math.round(avgRating * 10) / 10,
      totalReviews: service.reviews.length,
      provider: service.provider,
      reviews: service.reviews,
      isActive: service.isActive,
      createdAt: service.createdAt
    };

    res.status(200).json({
      status: 'success',
      data: { service: transformedService }
    });
  } catch (error) {
    console.error('Get service by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update service (Service Provider only - own services)
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if service exists and user is the provider
    const existingService = await prisma.service.findUnique({
      where: { id }
    });

    if (!existingService) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    if (existingService.providerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own services'
      });
    }

    const {
      name,
      description,
      category,
      price,
      duration,
      location,
      serviceArea,
      requirements,
      isActive
    } = req.body;

    // Handle new images
    let images = existingService.images;
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path.replace(/\\/g, '/'));
      images = [...images, ...newImages];
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(category && { category }),
        ...(price && { price: parseFloat(price) }),
        ...(duration && { duration: parseInt(duration) }),
        ...(location && { location }),
        ...(serviceArea && { serviceArea }),
        ...(requirements && { requirements }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        images
      },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true
          }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Service updated successfully',
      data: { service: updatedService }
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete service (Service Provider only - own services)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if service exists and user is the provider
    const existingService = await prisma.service.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS']
            }
          }
        }
      }
    });

    if (!existingService) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    if (existingService.providerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own services'
      });
    }

    // Check for active bookings
    if (existingService.bookings.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete service with active bookings'
      });
    }

    await prisma.service.delete({
      where: { id }
    });

    res.status(200).json({
      status: 'success',
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get services by provider ID
const getServicesByProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    const services = await prisma.service.findMany({
      where: { providerId },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        },
        bookings: {
          select: {
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform services with additional stats
    const servicesWithStats = services.map(service => {
      const avgRating = service.reviews.length > 0
        ? service.reviews.reduce((sum, review) => sum + review.rating, 0) / service.reviews.length
        : 0;

      const totalBookings = service.bookings.length;
      const completedBookings = service.bookings.filter(b => b.status === 'COMPLETED').length;

      return {
        id: service.id,
        name: service.name,
        category: service.category,
        description: service.description,
        price: service.price,
        duration: `${Math.floor(service.duration / 60)}-${Math.ceil(service.duration / 60)} hours`,
        includes: service.requirements,
        location: service.location,
        serviceArea: service.serviceArea,
        image: service.images[0] || null,
        images: service.images,
        rating: Math.round(avgRating * 10) / 10,
        totalReviews: service.reviews.length,
        totalBookings,
        completedBookings,
        isActive: service.isActive,
        provider: service.provider,
        createdAt: service.createdAt
      };
    });

    res.status(200).json({
      status: 'success',
      data: { services: servicesWithStats }
    });
  } catch (error) {
    console.error('Get services by provider error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get provider profile with reviews and services
const getProviderProfile = async (req, res) => {
  try {
    const { providerId } = req.params;

    // Get provider details
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        createdAt: true,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            category: true,
            description: true,
            price: true,
            duration: true,
            images: true,
            location: true,
            reviews: {
              select: { rating: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!provider) {
      return res.status(404).json({
        status: 'error',
        message: 'Provider not found'
      });
    }

    // Get reviews for all provider's services
    const reviews = await prisma.review.findMany({
      where: {
        service: {
          providerId: providerId
        },
        reviewType: 'SERVICE'
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
        service: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Calculate provider stats
    const allReviews = await prisma.review.findMany({
      where: {
        service: {
          providerId: providerId
        },
        reviewType: 'SERVICE'
      },
      select: { rating: true }
    });

    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length
      : 0;

    const totalServices = provider.services.length;
    const totalReviews = allReviews.length;

    // Transform response
    const profileResponse = {
      id: provider.id,
      name: `${provider.firstName} ${provider.lastName}`,
      firstName: provider.firstName,
      lastName: provider.lastName,
      email: provider.email,
      phone: provider.phone,
      avatar: provider.avatar,
      joinedDate: provider.createdAt,
      stats: {
        totalServices,
        totalReviews,
        averageRating: Math.round(avgRating * 10) / 10
      },
      services: provider.services.map(service => ({
        id: service.id,
        name: service.name,
        category: service.category,
        description: service.description,
        price: service.price,
        duration: service.duration,
        images: service.images,
        location: service.location,
        rating: service.reviews.length > 0
          ? Math.round((service.reviews.reduce((sum, r) => sum + r.rating, 0) / service.reviews.length) * 10) / 10
          : 0,
        reviewCount: service.reviews.length
      })),
      recentReviews: reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        author: {
          id: review.author.id,
          name: `${review.author.firstName} ${review.author.lastName}`,
          avatar: review.author.avatar
        },
        service: {
          id: review.service.id,
          name: review.service.name
        },
        createdAt: review.createdAt
      }))
    };

    res.status(200).json({
      status: 'success',
      data: { provider: profileResponse }
    });
  } catch (error) {
    console.error('Get provider profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch provider profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get service categories
const getServiceCategories = async (req, res) => {
  try {
    // Get categories from enum and count services in each
    const categories = await prisma.service.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: {
        category: true
      }
    });

    const categoryList = categories.map(cat => ({
      name: cat.category,
      count: cat._count.category
    }));

    res.status(200).json({
      status: 'success',
      data: { categories: categoryList }
    });
  } catch (error) {
    console.error('Get service categories error:', error);
    res.status(500).json({
      status: 'error',  
      message: 'Failed to fetch service categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get featured service providers
const getFeaturedProviders = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    // Get top-rated service providers with their services
    const providers = await prisma.user.findMany({
      where: {
        role: 'SERVICE_PROVIDER',
        services: {
          some: {
            isActive: true
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatar: true,
        services: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            category: true,
            price: true,
            images: true
          }
        }
      }
    });

    // Sort by number of services and take limit
    const sortedProviders = providers
      .sort((a, b) => b.services.length - a.services.length)
      .slice(0, parseInt(limit));

    // Transform data for frontend
    const providersList = sortedProviders.map(provider => ({
      id: provider.id,
      name: `${provider.firstName} ${provider.lastName}`,
      email: provider.email,
      phone: provider.phone,
      avatar: provider.avatar,
      serviceCount: provider.services.length,
      recentServices: provider.services.slice(0, 3)
    }));

    res.status(200).json({
      status: 'success',
      data: { providers: providersList }
    });
  } catch (error) {
    console.error('Get featured providers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch featured providers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get reviews for all services by a provider
const getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // First, get all services by this provider
    const services = await prisma.service.findMany({
      where: { providerId },
      select: { id: true }
    });

    const serviceIds = services.map(service => service.id);

    if (serviceIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          reviews: [],
          summary: {
            totalReviews: 0,
            averageRating: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          },
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }
      });
    }

    // Get reviews for all services by this provider
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          serviceId: { in: serviceIds },
          reviewType: 'SERVICE'
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
          service: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.review.count({
        where: {
          serviceId: { in: serviceIds },
          reviewType: 'SERVICE'
        }
      })
    ]);

    // Calculate rating distribution and average
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    reviews.forEach(review => {
      ratingDistribution[review.rating]++;
      totalRating += review.rating;
    });

    // Also count all reviews for the summary (not just paginated ones)
    const allReviews = await prisma.review.findMany({
      where: {
        serviceId: { in: serviceIds },
        reviewType: 'SERVICE'
      },
      select: { rating: true }
    });

    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0
      ? Math.round((allReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews) * 10) / 10
      : 0;

    // Calculate rating distribution for all reviews
    const fullRatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allReviews.forEach(review => {
      fullRatingDistribution[review.rating]++;
    });

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
        summary: {
          totalReviews,
          averageRating,
          ratingDistribution: fullRatingDistribution
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get provider reviews error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch provider reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  getServicesByProvider,
  getServiceCategories,
  getFeaturedProviders,
  getProviderProfile,
  getProviderReviews
};