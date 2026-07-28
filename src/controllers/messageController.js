const { PrismaClient } = require('@prisma/client');
const {
  sendMessageSchema,
  messageQuerySchema,
  messageIdSchema
} = require('../validators/messageValidators');

const prisma = new PrismaClient();

/**
 * Send a message
 */
const sendMessage = async (req, res) => {
  try {
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { receiverId, content, messageType, propertyId, serviceId } = value;
    const senderId = req.user.id;

    // Validate receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return res.status(404).json({
        status: 'error',
        message: 'Recipient not found'
      });
    }

    // Don't allow sending messages to yourself
    if (senderId === receiverId) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot send message to yourself'
      });
    }

    // Validate property/service exists if provided
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId }
      });
      if (!property) {
        return res.status(404).json({
          status: 'error',
          message: 'Property not found'
        });
      }
    }

    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId }
      });
      if (!service) {
        return res.status(404).json({
          status: 'error',
          message: 'Service not found'
        });
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        messageType: messageType || 'DIRECT',
        senderId,
        receiverId,
        propertyId,
        serviceId
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      data: { message }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message'
    });
  }
};

/**
 * Get messages for current user
 */
const getMessages = async (req, res) => {
  try {
    const { error, value } = messageQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { otherUserId, page = 1, limit = 20 } = value;
    const userId = req.user.id;
    const skip = (page - 1) * limit;

    let whereClause = {};
    let includeClause = {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      }
    };

    if (otherUserId) {
      // Get conversation with specific user
      whereClause = {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      };
    } else {
      // Get all messages for current user
      whereClause = {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      };
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: includeClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    // Get total count
    const total = await prisma.message.count({ where: whereClause });

    // Mark messages as read if user is the receiver
    if (otherUserId) {
      await prisma.message.updateMany({
        where: {
          senderId: otherUserId,
          receiverId: userId,
          isRead: false
        },
        data: { isRead: true }
      });
    }

    res.json({
      status: 'success',
      data: {
        messages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch messages'
    });
  }
};

/**
 * Get message conversations (unique users with recent message)
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all unique conversations
    const conversations = await prisma.$queryRaw`
      SELECT DISTINCT
        CASE
          WHEN m."senderId" = ${userId} THEN m."receiverId"
          ELSE m."senderId"
        END as other_user_id,
        u."firstName",
        u."lastName",
        u.avatar,
        m.content as last_message,
        m."createdAt" as last_message_time,
        m."isRead",
        (
          SELECT COUNT(*)
          FROM messages m2
          WHERE m2."receiverId" = ${userId}
            AND m2."senderId" = (
              CASE
                WHEN m."senderId" = ${userId} THEN m."receiverId"
                ELSE m."senderId"
              END
            )
            AND m2."isRead" = false
        ) as unread_count
      FROM messages m
      JOIN users u ON (
        CASE
          WHEN m."senderId" = ${userId} THEN m."receiverId"
          ELSE m."senderId"
        END = u.id
      )
      WHERE m."senderId" = ${userId} OR m."receiverId" = ${userId}
      ORDER BY m."createdAt" DESC
    `;

    // Remove duplicates (keep only the most recent conversation per user)
    const uniqueConversations = [];
    const seenUsers = new Set();

    for (const conv of conversations) {
      if (!seenUsers.has(conv.other_user_id)) {
        uniqueConversations.push(conv);
        seenUsers.add(conv.other_user_id);
      }
    }

    res.json({
      status: 'success',
      data: { conversations: uniqueConversations }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch conversations'
    });
  }
};

/**
 * Mark message as read
 */
const markMessageRead = async (req, res) => {
  try {
    const { error, value } = messageIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid message ID'
      });
    }

    const { id } = value;
    const userId = req.user.id;

    // Check if message exists and user is the receiver
    const message = await prisma.message.findFirst({
      where: {
        id,
        receiverId: userId
      }
    });

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found or access denied'
      });
    }

    // Mark as read
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({
      status: 'success',
      message: 'Message marked as read',
      data: { message: updatedMessage }
    });

  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to mark message as read'
    });
  }
};

/**
 * Delete a message
 */
const deleteMessage = async (req, res) => {
  try {
    const { error, value } = messageIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid message ID'
      });
    }

    const { id } = value;
    const userId = req.user.id;

    // Check if message exists and user is sender or receiver
    const message = await prisma.message.findFirst({
      where: {
        id,
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }
    });

    if (!message) {
      return res.status(404).json({
        status: 'error',
        message: 'Message not found or access denied'
      });
    }

    // Delete message
    await prisma.message.delete({
      where: { id }
    });

    res.json({
      status: 'success',
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete message'
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getConversations,
  markMessageRead,
  deleteMessage
};