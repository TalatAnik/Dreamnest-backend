const { PrismaClient } = require('@prisma/client');
const {
  globalSearchSchema,
  searchSuggestionsSchema
} = require('../validators/searchValidators');

const prisma = new PrismaClient();

/**
 * Global search across properties, services, and users
 */
const globalSearch = async (req, res) => {
  try {
    const { error, value } = globalSearchSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { q: query, type, page = 1, limit = 10 } = value;
    const skip = (page - 1) * limit;

    const searchResults = {
      properties: [],
      services: [],
      users: []
    };

    let totalResults = 0;

    // Search properties
    if (!type || type === 'properties') {
      const properties = await prisma.property.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { address: { contains: query, mode: 'insensitive' } },
                { city: { contains: query, mode: 'insensitive' } },
                { state: { contains: query, mode: 'insensitive' } }
              ]
            }
          ]
        },
        select: {
          id: true,
          title: true,
          description: true,
          monthlyRent: true,
          address: true,
          city: true,
          state: true,
          images: true,
          createdAt: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              reviews: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'properties' ? skip : 0,
        take: type === 'properties' ? limit : 5 // Limit results when searching all types
      });

      searchResults.properties = properties;
      if (type === 'properties') totalResults += await prisma.property.count({ where: { isActive: true } });
    }

    // Search services
    if (!type || type === 'services') {
      const services = await prisma.service.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } }
              ]
            }
          ]
        },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          category: true,
          images: true,
          createdAt: true,
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              reviews: true,
              bookings: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'services' ? skip : 0,
        take: type === 'services' ? limit : 5 // Limit results when searching all types
      });

      searchResults.services = services;
      if (type === 'services') totalResults += await prisma.service.count({ where: { isActive: true } });
    }

    // Search users (only for service providers and owners)
    if (!type || type === 'users') {
      const users = await prisma.user.findMany({
        where: {
          AND: [
            { isActive: true },
            { role: { in: ['OWNER', 'SERVICE_PROVIDER'] } },
            {
              OR: [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } }
              ]
            }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              ownedProperties: { where: { isActive: true } },
              services: { where: { isActive: true } },
              reviews: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'users' ? skip : 0,
        take: type === 'users' ? limit : 5 // Limit results when searching all types
      });

      searchResults.users = users;
      if (type === 'users') totalResults += await prisma.user.count({
        where: {
          isActive: true,
          role: { in: ['OWNER', 'SERVICE_PROVIDER'] }
        }
      });
    }

    // Calculate total for all types search
    if (!type) {
      const [propertyCount, serviceCount, userCount] = await Promise.all([
        prisma.property.count({ where: { isActive: true } }),
        prisma.service.count({ where: { isActive: true } }),
        prisma.user.count({
          where: {
            isActive: true,
            role: { in: ['OWNER', 'SERVICE_PROVIDER'] }
          }
        })
      ]);
      totalResults = propertyCount + serviceCount + userCount;
    }

    res.json({
      status: 'success',
      data: {
        results: searchResults,
        total: totalResults,
        pagination: type ? {
          page: Number(page),
          limit: Number(limit),
          total: totalResults,
          pages: Math.ceil(totalResults / limit)
        } : null
      }
    });

  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform search'
    });
  }
};

/**
 * Get search suggestions
 */
const getSearchSuggestions = async (req, res) => {
  try {
    const { error, value } = searchSuggestionsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { q: query } = value;

    if (!query || query.length < 2) {
      return res.json({
        status: 'success',
        data: { suggestions: [] }
      });
    }

    const suggestions = [];

    // Get property title suggestions
    const propertyTitles = await prisma.property.findMany({
      where: {
        isActive: true,
        title: { contains: query, mode: 'insensitive' }
      },
      select: { title: true },
      take: 5,
      orderBy: { title: 'asc' }
    });

    suggestions.push(...propertyTitles.map(p => ({ text: p.title, type: 'property' })));

    // Get service title suggestions
    const serviceTitles = await prisma.service.findMany({
      where: {
        isActive: true,
        title: { contains: query, mode: 'insensitive' }
      },
      select: { title: true },
      take: 5,
      orderBy: { title: 'asc' }
    });

    suggestions.push(...serviceTitles.map(s => ({ text: s.title, type: 'service' })));

    // Get location suggestions (cities)
    const cities = await prisma.property.findMany({
      where: {
        isActive: true,
        city: { contains: query, mode: 'insensitive' }
      },
      select: { city: true, state: true },
      distinct: ['city'],
      take: 3
    });

    suggestions.push(...cities.map(c => ({ text: `${c.city}, ${c.state}`, type: 'location' })));

    // Get service category suggestions
    const categories = await prisma.service.findMany({
      where: {
        isActive: true,
        category: { contains: query, mode: 'insensitive' }
      },
      select: { category: true },
      distinct: ['category'],
      take: 3
    });

    suggestions.push(...categories.map(c => ({ text: c.category, type: 'category' })));

    // Remove duplicates and limit to 10 suggestions
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) =>
        index === self.findIndex(s => s.text === suggestion.text)
      )
      .slice(0, 10);

    res.json({
      status: 'success',
      data: { suggestions: uniqueSuggestions }
    });

  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get search suggestions'
    });
  }
};

module.exports = {
  globalSearch,
  getSearchSuggestions
};