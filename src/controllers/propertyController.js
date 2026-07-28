const { PrismaClient } = require('@prisma/client');
const emailService = require('../utils/emailService');

const prisma = new PrismaClient();

// Create new property
const createProperty = async (req, res) => {
  try {
    const {
      title,
      description,
      address,
      city,
      state,
      zipCode,
      country = 'Bangladesh',
      latitude,
      longitude,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      maxOccupants,
      monthlyRent,
      securityDeposit = 0,
      availableFrom,
      amenities = [],
      rules = []
    } = req.body;

    // Get images from uploaded files
    const images = req.files ? req.files.map(file => file.path.replace(/\\/g, '/')) : [];

    const property = await prisma.property.create({
      data: {
        title,
        description,
        address,
        city,
        state,
        zipCode,
        country,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        propertyType,
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        area: parseFloat(area),
        maxOccupants: maxOccupants ? parseInt(maxOccupants) : null,
        monthlyRent: monthlyRent ? parseFloat(monthlyRent) : null,
        securityDeposit: parseFloat(securityDeposit),
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        amenities,
        images,
        rules,
        ownerId: req.user.id
      },
      include: {
        owner: {
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
      message: 'Property created successfully',
      data: { property }
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all properties with search and filtering
const getProperties = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      state,
      propertyType,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      minArea,
      maxArea,
      amenities,
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
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } }
        ]
      }),
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(state && { state: { contains: state, mode: 'insensitive' } }),
      ...(propertyType && { propertyType }),
      ...(minPrice && { monthlyRent: { gte: parseFloat(minPrice) } }),
      ...(maxPrice && { monthlyRent: { lte: parseFloat(maxPrice) } }),
      ...(bedrooms && { bedrooms: parseInt(bedrooms) }),
      ...(bathrooms && { bathrooms: { gte: parseInt(bathrooms) } }),
      ...(minArea && { area: { gte: parseFloat(minArea) } }),
      ...(maxArea && { area: { lte: parseFloat(maxArea) } }),
      ...(amenities && {
        amenities: {
          hasSome: Array.isArray(amenities) ? amenities : [amenities]
        }
      })
    };

    // Build orderBy clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder.toLowerCase();

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          },
          _count: {
            select: {
              reviews: true
            }
          }
        },
        skip,
        take,
        orderBy
      }),
      prisma.property.count({ where })
    ]);

    // Calculate average rating for each property
    const propertiesWithRatings = await Promise.all(
      properties.map(async (property) => {
        const avgRating = await prisma.review.aggregate({
          where: {
            propertyId: property.id,
            reviewType: 'PROPERTY'
          },
          _avg: {
            rating: true
          }
        });

        return {
          ...property,
          averageRating: avgRating._avg.rating || 0,
          reviewCount: property._count.reviews
        };
      })
    );

    const totalPages = Math.ceil(total / take);

    res.status(200).json({
      status: 'success',
      data: {
        properties: propertiesWithRatings,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: take,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch properties',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single property by ID
const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
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
            reviewType: 'PROPERTY'
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      }
    });

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    // Calculate average rating
    const avgRating = await prisma.review.aggregate({
      where: {
        propertyId: property.id,
        reviewType: 'PROPERTY'
      },
      _avg: {
        rating: true
      }
    });

    const propertyWithRating = {
      ...property,
      averageRating: avgRating._avg.rating || 0,
      reviewCount: property._count.reviews
    };

    res.status(200).json({
      status: 'success',
      data: { property: propertyWithRating }
    });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update property (owner only)
const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if property exists and user is owner
    const existingProperty = await prisma.property.findUnique({
      where: { id }
    });

    if (!existingProperty) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    if (existingProperty.ownerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only update your own properties'
      });
    }

    const {
      title,
      description,
      address,
      city,
      state,
      zipCode,
      country,
      latitude,
      longitude,
      propertyType,
      bedrooms,
      bathrooms,
      area,
      maxOccupants,
      monthlyRent,
      securityDeposit,
      isActive,
      availableFrom,
      amenities,
      rules
    } = req.body;

    // Handle new images
    let images = existingProperty.images;
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path.replace(/\\/g, '/'));
      images = [...images, ...newImages];
    }

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(address && { address }),
        ...(city && { city }),
        ...(state && { state }),
        ...(zipCode && { zipCode }),
        ...(country && { country }),
        ...(latitude && { latitude: parseFloat(latitude) }),
        ...(longitude && { longitude: parseFloat(longitude) }),
        ...(propertyType && { propertyType }),
        ...(bedrooms && { bedrooms: parseInt(bedrooms) }),
        ...(bathrooms && { bathrooms: parseInt(bathrooms) }),
        ...(area && { area: parseFloat(area) }),
        ...(maxOccupants && { maxOccupants: parseInt(maxOccupants) }),
        ...(monthlyRent && { monthlyRent: parseFloat(monthlyRent) }),
        ...(securityDeposit !== undefined && { securityDeposit: parseFloat(securityDeposit) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(availableFrom && { availableFrom: new Date(availableFrom) }),
        ...(amenities && { amenities }),
        ...(rules && { rules }),
        images
      },
      include: {
        owner: {
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
      message: 'Property updated successfully',
      data: { property: updatedProperty }
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete property (owner only)
const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if property exists and user is owner
    const existingProperty = await prisma.property.findUnique({
      where: { id }
    });

    if (!existingProperty) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    if (existingProperty.ownerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own properties'
      });
    }

    await prisma.property.delete({
      where: { id }
    });

    res.status(200).json({
      status: 'success',
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete property',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's properties (owner only)
const getUserProperties = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      status = 'all', // all, active, inactive
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      ownerId: userId,
      ...(status !== 'all' && {
        isActive: status === 'active'
      })
    };

    const orderBy = {};
    orderBy[sortBy] = sortOrder.toLowerCase();

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          _count: {
            select: {
              reviews: true
            }
          }
        },
        skip,
        take,
        orderBy
      }),
      prisma.property.count({ where })
    ]);

    // Calculate average rating and recent booking stats
    const propertiesWithStats = await Promise.all(
      properties.map(async (property) => {
        const avgRating = await prisma.review.aggregate({
          where: {
            propertyId: property.id,
            reviewType: 'PROPERTY'
          },
          _avg: {
            rating: true
          }
        });

        return {
          ...property,
          averageRating: avgRating._avg.rating || 0,
          reviewCount: property._count.reviews
        };
      })
    );

    const totalPages = Math.ceil(total / take);

    res.status(200).json({
      status: 'success',
      data: {
        properties: propertiesWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: take,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get user properties error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch your properties',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Send property inquiry (email-based)
const sendPropertyInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, checkInDate, checkOutDate, guests } = req.body;

    // Get property with owner details
    const property = await prisma.property.findUnique({
      where: { id },
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

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    // Get inquirer details
    const inquirer = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true
      }
    });

    // Prepare email content
    const inquiryDetails = {
      propertyTitle: property.title,
      propertyAddress: `${property.address}, ${property.city}, ${property.state}`,
      inquirerName: `${inquirer.firstName} ${inquirer.lastName}`,
      inquirerEmail: inquirer.email,
      inquirerPhone: inquirer.phone || 'Not provided',
      message,
      checkInDate: checkInDate || 'Not specified',
      checkOutDate: checkOutDate || 'Not specified',
      guests: guests || 'Not specified'
    };

    // Send email to property owner
    const emailSubject = `Property Inquiry: ${property.title}`;
    const emailBody = `
      Dear ${property.owner.firstName} ${property.owner.lastName},

      You have received a new inquiry for your property: ${property.title}

      Property Details:
      - Title: ${property.title}
      - Address: ${inquiryDetails.propertyAddress}

      Inquirer Details:
      - Name: ${inquiryDetails.inquirerName}
      - Email: ${inquiryDetails.inquirerEmail}
      - Phone: ${inquiryDetails.inquirerPhone}

      Booking Details:
      - Check-in Date: ${inquiryDetails.checkInDate}
      - Check-out Date: ${inquiryDetails.checkOutDate}
      - Number of Guests: ${inquiryDetails.guests}

      Message:
      ${message}

      Please respond to this inquiry by contacting the inquirer directly at ${inquirer.email}.

      Best regards,
      DreamNest Team
    `;

    await emailService.sendEmail(property.owner.email, emailSubject, emailBody);

    // Send confirmation email to inquirer
    const confirmationSubject = `Your inquiry for ${property.title} has been sent`;
    const confirmationBody = `
      Dear ${inquirer.firstName},

      Your inquiry for the property "${property.title}" has been successfully sent to the property owner.

      The property owner will review your inquiry and contact you directly at this email address or via phone if provided.

      Property Details:
      - Title: ${property.title}
      - Address: ${inquiryDetails.propertyAddress}
      - Price per night: $${property.monthlyRent}

      Your Inquiry Details:
      - Check-in Date: ${inquiryDetails.checkInDate}
      - Check-out Date: ${inquiryDetails.checkOutDate}
      - Number of Guests: ${inquiryDetails.guests}

      Thank you for using DreamNest!

      Best regards,
      DreamNest Team
    `;

    await emailService.sendEmail(inquirer.email, confirmationSubject, confirmationBody);

    res.status(200).json({
      status: 'success',
      message: 'Property inquiry sent successfully. The property owner will contact you directly.'
    });
  } catch (error) {
    console.error('Send property inquiry error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send property inquiry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove image from property
const removePropertyImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    const userId = req.user.id;

    // Check if property exists and user is owner
    const property = await prisma.property.findUnique({
      where: { id }
    });

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    if (property.ownerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only modify your own properties'
      });
    }

    // Remove image from array
    const updatedImages = property.images.filter(img => img !== imageUrl);

    const updatedProperty = await prisma.property.update({
      where: { id },
      data: {
        images: updatedImages
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Image removed successfully',
      data: { images: updatedProperty.images }
    });
  } catch (error) {
    console.error('Remove property image error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to remove image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get reviews for a specific property
 */
const getPropertyReviews = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id },
      select: { id: true, title: true }
    });

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    // Get reviews for the property
    const reviews = await prisma.review.findMany({
      where: {
        propertyId: id,
        reviewType: 'PROPERTY'
      },
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
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate average rating
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    // Group reviews by rating
    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    reviews.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    res.status(200).json({
      status: 'success',
      data: {
        property: {
          id: property.id,
          title: property.title
        },
        reviews,
        summary: {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
          ratingDistribution
        }
      }
    });
  } catch (error) {
    console.error('Get property reviews error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get property reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getUserProperties,
  sendPropertyInquiry,
  removePropertyImage,
  getPropertyReviews
};