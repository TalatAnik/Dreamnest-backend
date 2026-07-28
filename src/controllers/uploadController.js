const { getFileUrl, deleteFile } = require('../middleware/uploadMiddleware');
const { PrismaClient } = require('@prisma/client');
const { uploadSchema } = require('../validators/uploadValidators');

const prisma = new PrismaClient();

/**
 * General file upload handler
 */
const uploadFile = async (req, res) => {
  try {
    const { error, value } = uploadSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { category } = value;

    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    const file = req.file;
    const fileUrl = getFileUrl(req, file.path);

    // Store file metadata in database if needed
    let fileRecord = null;
    if (category === 'avatar' || category === 'document') {
      // For avatars and documents, we might want to track them
      fileRecord = await prisma.file.create({
        data: {
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          url: fileUrl,
          category: category.toUpperCase(),
          uploadedById: req.user.id
        }
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'File uploaded successfully',
      data: {
        fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        category,
        fileId: fileRecord?.id
      }
    });

  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload file'
    });
  }
};

/**
 * Upload user avatar
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No avatar file uploaded'
      });
    }

    const file = req.file;
    const fileUrl = getFileUrl(req, file.path);
    const userId = req.user.id;

    // Get current user to check if they have an existing avatar
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true }
    });

    // Delete old avatar file if it exists
    if (user.avatar) {
      // Extract file path from URL
      const oldFilePath = user.avatar.replace(`${req.protocol}://${req.get('host')}/`, '');
      deleteFile(oldFilePath);
    }

    // Update user avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: fileUrl },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true
      }
    });

    // Store file metadata
    await prisma.file.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: fileUrl,
        category: 'AVATAR',
        uploadedById: userId
      }
    });

    res.json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: {
        user: updatedUser,
        avatarUrl: fileUrl
      }
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload avatar'
    });
  }
};

/**
 * Get public profile for a user
 */
const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            ownedProperties: {
              where: { isActive: true }
            },
            services: {
              where: { isActive: true }
            },
            reviews: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get user's properties (public view)
    const properties = await prisma.property.findMany({
      where: {
        ownerId: userId,
        isActive: true
      },
      select: {
        id: true,
        title: true,
        description: true,
        monthlyRent: true,
        city: true,
        state: true,
        images: true,
        createdAt: true,
        _count: {
          select: {
            reviews: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 6 // Limit to 6 for profile view
    });

    // Get user's services (public view)
    const services = await prisma.service.findMany({
      where: {
        providerId: userId,
        isActive: true
      },
      select: {
        id: true,
        title: true,
        description: true,
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
      orderBy: { createdAt: 'desc' },
      take: 6 // Limit to 6 for profile view
    });

    // Get average rating from reviews
    const reviewStats = await prisma.review.aggregate({
      where: {
        OR: [
          { property: { ownerId: userId } },
          { service: { providerId: userId } }
        ]
      },
      _avg: { rating: true },
      _count: true
    });

    res.json({
      status: 'success',
      data: {
        profile: {
          ...user,
          averageRating: reviewStats._avg.rating ? Number(reviewStats._avg.rating.toFixed(1)) : 0,
          totalReviews: reviewStats._count
        },
        properties,
        services
      }
    });

  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch public profile'
    });
  }
};

/**
 * Delete a file
 */
const deleteUploadedFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        status: 'error',
        message: 'File ID is required'
      });
    }

    // Get file record
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    // Check if user owns the file
    if (file.uploadedById !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only delete your own files'
      });
    }

    // Delete physical file
    const deleted = deleteFile(file.path);

    if (deleted) {
      // Delete database record
      await prisma.file.delete({
        where: { id: fileId }
      });

      res.json({
        status: 'success',
        message: 'File deleted successfully'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete file from storage'
      });
    }

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete file'
    });
  }
};

module.exports = {
  uploadFile,
  uploadAvatar,
  getPublicProfile,
  deleteUploadedFile
};