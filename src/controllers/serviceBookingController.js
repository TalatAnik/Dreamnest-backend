const { PrismaClient } = require('@prisma/client');
const emailService = require('../utils/emailService');

const prisma = new PrismaClient();

// Create new service booking
const createServiceBooking = async (req, res) => {
  try {
    const {
      serviceId,
      scheduledDate,
      scheduledTime,
      specialRequests,
      isUrgent = false
    } = req.body;

    // Verify service exists and is active
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
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

    if (!service.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'Service is not currently available'
      });
    }

    // Prevent provider from booking their own service
    if (service.providerId === req.user.id) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot book your own service'
      });
    }

    // Calculate total amount (with urgency fee)
    let totalAmount = service.price;
    if (isUrgent) {
      totalAmount = totalAmount * 1.5; // 50% urgency fee
    }

    const booking = await prisma.serviceBooking.create({
      data: {
        serviceId,
        bookerId: req.user.id,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        duration: service.duration,
        totalAmount,
        specialRequests: specialRequests || null,
        status: 'PENDING',
        paymentStatus: 'PENDING'
      },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            category: true,
            price: true,
            duration: true
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
      }
    });

    // Send email notifications
    try {
      // Notify service provider
      await emailService.sendEmail(
        service.provider.email,
        'New Service Booking Request',
        `
        <h2>New Booking Request</h2>
        <p>Hello ${service.provider.firstName},</p>
        
        <p>You have received a new booking request for your service:</p>
        
        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <h3>${service.title}</h3>
          <p><strong>Customer:</strong> ${req.user.firstName} ${req.user.lastName}</p>
          <p><strong>Email:</strong> ${req.user.email}</p>
          <p><strong>Phone:</strong> ${req.user.phone || 'Not provided'}</p>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Scheduled Date:</strong> ${new Date(scheduledDate).toLocaleDateString()}</p>
          <p><strong>Scheduled Time:</strong> ${scheduledTime}</p>
          <p><strong>Duration:</strong> ${Math.floor(service.duration / 60)} hours</p>
          <p><strong>Total Amount:</strong> ৳${totalAmount.toLocaleString()}</p>
          ${isUrgent ? '<p><strong>⚡ URGENT BOOKING</strong> (50% urgency fee applied)</p>' : ''}
          ${specialRequests ? `<p><strong>Special Requests:</strong> ${specialRequests}</p>` : ''}
        </div>
        
        <p>Please confirm or decline this booking request through your dashboard.</p>
        
        <p>Best regards,<br>DreamNest Team</p>
        `
      );

      // Notify customer
      await emailService.sendEmail(
        req.user.email,
        'Service Booking Confirmation',
        `
        <h2>Booking Request Submitted</h2>
        <p>Hello ${req.user.firstName},</p>
        
        <p>Your service booking request has been submitted successfully:</p>
        
        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <h3>${service.title}</h3>
          <p><strong>Provider:</strong> ${service.provider.firstName} ${service.provider.lastName}</p>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
          <p><strong>Scheduled Date:</strong> ${new Date(scheduledDate).toLocaleDateString()}</p>
          <p><strong>Scheduled Time:</strong> ${scheduledTime}</p>
          <p><strong>Duration:</strong> ${Math.floor(service.duration / 60)} hours</p>
          <p><strong>Total Amount:</strong> ৳${totalAmount.toLocaleString()}</p>
          <p><strong>Status:</strong> Pending Confirmation</p>
        </div>
        
        <p>The service provider will review your request and confirm shortly. You will receive an email notification once the booking is confirmed.</p>
        
        <p>Best regards,<br>DreamNest Team</p>
        `
      );
    } catch (emailError) {
      console.error('Email notification error:', emailError);
      // Don't fail the booking if email fails
    }

    // Transform booking to match frontend expectations
    const transformedBooking = {
      id: booking.id,
      service: booking.service.title,
      provider: `${service.provider.firstName} ${service.provider.lastName}`,
      customer: `${booking.booker.firstName} ${booking.booker.lastName}`,
      date: new Date(booking.scheduledDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: booking.scheduledTime,
      status: booking.status.toLowerCase(),
      total: booking.totalAmount,
      paymentStatus: booking.paymentStatus.toLowerCase(),
      specialRequests: booking.specialRequests,
      createdAt: booking.createdAt
    };

    res.status(201).json({
      status: 'success',
      message: 'Service booking created successfully',
      data: { booking: transformedBooking }
    });
  } catch (error) {
    console.error('Create service booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create service booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all bookings for current user (both as customer and provider)
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'all', status, page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let bookings = [];

    if (type === 'customer' || type === 'all') {
      // Get bookings where user is the customer
      const customerBookings = await prisma.serviceBooking.findMany({
        where: {
          bookerId: userId,
          ...(status && { status: status.toUpperCase() })
        },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              category: true,
              price: true,
              duration: true,
              provider: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  phone: true,
                  email: true
                }
              }
            }
          },
          booker: {
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
        },
        skip: type === 'customer' ? skip : 0,
        take: type === 'customer' ? take : undefined
      });

      bookings = [...bookings, ...customerBookings.map(booking => ({
        ...booking,
        userRole: 'customer'
      }))];
    }

    if (type === 'provider' || type === 'all') {
      // Get bookings where user is the service provider
      const providerBookings = await prisma.serviceBooking.findMany({
        where: {
          service: {
            providerId: userId
          },
          ...(status && { status: status.toUpperCase() })
        },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              category: true,
              price: true,
              duration: true,
              provider: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true
                }
              }
            }
          },
          booker: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              phone: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: type === 'provider' ? skip : 0,
        take: type === 'provider' ? take : undefined
      });

      bookings = [...bookings, ...providerBookings.map(booking => ({
        ...booking,
        userRole: 'provider'
      }))];
    }

    // Sort all bookings by creation date
    bookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination for 'all' type
    if (type === 'all') {
      const total = bookings.length;
      bookings = bookings.slice(skip, skip + take);
    }

    // Transform bookings to match frontend expectations
    const transformedBookings = bookings.map(booking => ({
      id: booking.id,
      service: booking.service.title,
      provider: `${booking.service.provider.firstName} ${booking.service.provider.lastName}`,
      customer: `${booking.booker.firstName} ${booking.booker.lastName}`,
      date: new Date(booking.scheduledDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: booking.scheduledTime,
      status: booking.status.toLowerCase(),
      total: booking.totalAmount,
      paymentStatus: booking.paymentStatus.toLowerCase(),
      specialRequests: booking.specialRequests,
      userRole: booking.userRole,
      serviceCategory: booking.service.category,
      duration: Math.floor(booking.service.duration / 60),
      createdAt: booking.createdAt
    }));

    res.status(200).json({
      status: 'success',
      data: { 
        bookings: transformedBookings,
        pagination: {
          page: parseInt(page),
          limit: take,
          total: transformedBookings.length
        }
      }
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: {
        service: {
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
        },
        booker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true
          }
        },
        payment: true
      }
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user has access to this booking
    const hasAccess = booking.bookerId === userId || booking.service.providerId === userId;
    if (!hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Transform booking to match frontend expectations  
    const transformedBooking = {
      id: booking.id,
      service: {
        id: booking.service.id,
        name: booking.service.title,
        category: booking.service.category,
        description: booking.service.description,
        price: booking.service.price,
        duration: Math.floor(booking.service.duration / 60),
        location: booking.service.location
      },
      provider: booking.service.provider,
      customer: booking.booker,
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      date: new Date(booking.scheduledDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      status: booking.status.toLowerCase(),
      paymentStatus: booking.paymentStatus.toLowerCase(),
      total: booking.totalAmount,
      payment: booking.payment,
      specialRequests: booking.specialRequests,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };

    res.status(200).json({
      status: 'success',
      data: { booking: transformedBooking }
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update booking status (Provider only)
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'IN_PROGRESS'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid booking status'
      });
    }

    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            provider: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        booker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Only service provider can update booking status
    if (booking.service.providerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the service provider can update booking status'
      });
    }

    const updatedBooking = await prisma.serviceBooking.update({
      where: { id },
      data: { status },
      include: {
        service: {
          select: {
            name: true,
            provider: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        booker: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Send email notification to customer
    try {
      const statusMessages = {
        CONFIRMED: 'confirmed',
        CANCELLED: 'cancelled',  
        COMPLETED: 'completed',
        IN_PROGRESS: 'started'
      };

      if (statusMessages[status]) {
        await emailService.sendEmail(
          booking.booker.email,
          `Service Booking ${statusMessages[status].charAt(0).toUpperCase() + statusMessages[status].slice(1)}`,
          `
          <h2>Booking Status Update</h2>
          <p>Hello ${booking.booker.firstName},</p>
          
          <p>Your service booking has been <strong>${statusMessages[status]}</strong>:</p>
          
          <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h3>${booking.service.name}</h3>
            <p><strong>Booking ID:</strong> ${id}</p>
            <p><strong>Provider:</strong> ${booking.service.provider.firstName} ${booking.service.provider.lastName}</p>
            <p><strong>Status:</strong> ${statusMessages[status].charAt(0).toUpperCase() + statusMessages[status].slice(1)}</p>
            <p><strong>Date:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${booking.scheduledTime}</p>
          </div>
          
          ${status === 'CONFIRMED' ? '<p>The service provider will contact you soon with further details.</p>' : ''}
          ${status === 'COMPLETED' ? '<p>Thank you for using our service! Please consider leaving a review.</p>' : ''}
          
          <p>Best regards,<br>DreamNest Team</p>
          `
        );
      }
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Booking status updated successfully',
      data: { 
        booking: {
          id: updatedBooking.id,
          status: updatedBooking.status.toLowerCase(),
          updatedAt: updatedBooking.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update booking status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Cancel booking (Customer only)
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            provider: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        booker: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Only customer can cancel their booking
    if (booking.bookerId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the customer can cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Booking cannot be cancelled in its current status'
      });
    }

    const updatedBooking = await prisma.serviceBooking.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    // Send email notification to provider
    try {
      await emailService.sendEmail(
        booking.service.provider.email,
        'Service Booking Cancelled',
        `
        <h2>Booking Cancellation</h2>
        <p>Hello ${booking.service.provider.firstName},</p>
        
        <p>A service booking has been cancelled by the customer:</p>
        
        <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <h3>${booking.service.name}</h3>
          <p><strong>Booking ID:</strong> ${id}</p>
          <p><strong>Customer:</strong> ${booking.booker.firstName} ${booking.booker.lastName}</p>
          <p><strong>Date:</strong> ${new Date(booking.scheduledDate).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.scheduledTime}</p>
          <p><strong>Status:</strong> Cancelled</p>
        </div>
        
        <p>The booking slot is now available for other customers.</p>
        
        <p>Best regards,<br>DreamNest Team</p>
        `
      );
    } catch (emailError) {
      console.error('Email notification error:', emailError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: {
        booking: {
          id: updatedBooking.id,
          status: updatedBooking.status.toLowerCase(),
          updatedAt: updatedBooking.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createServiceBooking,
  getUserBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking
};