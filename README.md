# DreamNest Backend API

Backend API for the DreamNest property rental platform built with Node.js, Express, PostgreSQL, and Prisma ORM.

## 🚀 Phase 1 Implementation Complete

This implementation includes the core infrastructure and authentication system as specified in Phase 1 of the development plan.

### ✅ Completed Features

- **Project Setup**
  - Node.js + Express server
  - PostgreSQL database with Prisma ORM
  - Environment configuration
  - Security middleware (CORS, Helmet, Rate Limiting)
  - Error handling middleware
  - Request logging

- **Authentication System**
  - User registration with validation
  - User login with JWT tokens
  - Password hashing with bcrypt
  - Profile management
  - Password change functionality
  - Mock email service for development

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🛠 Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup PostgreSQL database**
   - Create a PostgreSQL database named `dreamnest_db`
   - Update the `DATABASE_URL` in `.env.local` with your database credentials

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your specific configuration
   ```

4. **Generate Prisma client**
   ```bash
   npm run prisma:generate
   ```

5. **Run database migrations**
   ```bash
   npm run prisma:migrate
   ```

6. **Seed the database (optional)**
   ```bash
   npm run prisma:seed
   ```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3001`

## 📖 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "RENTER"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

#### Get Profile (Protected)
```http
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

#### Update Profile (Protected)
```http
PUT /api/auth/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890"
}
```

#### Change Password (Protected)
```http
POST /api/auth/change-password
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

### Health Check
```http
GET /api/health
```

## 🗄 Database Schema

The database includes the following tables:
- **users** - User accounts and authentication
- **properties** - Property listings
- **services** - Service provider offerings
- **bookings** - Property rental bookings
- **service_bookings** - Service bookings
- **payments** - Payment records (mock system)
- **reviews** - User and property reviews
- **notifications** - User notifications
- **messages** - User messaging

## 🔧 Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed database with sample data

## 🧪 Sample Accounts

After running the seed script, you can use these test accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dreamnest.com | Admin123 |
| Renter | renter@dreamnest.com | Renter123 |
| Property Owner | owner@dreamnest.com | Owner123 |
| Service Provider | provider@dreamnest.com | Provider123 |

## 🛡 Security Features

- Password hashing with bcrypt (12 salt rounds)
- JWT token authentication
- Rate limiting (100 requests per 15 minutes per IP)
- CORS protection
- Helmet security headers
- Input validation with Joi
- SQL injection protection via Prisma ORM

## 🏗 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.js           # Database seeding
├── src/
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Custom middleware
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── validators/      # Input validation schemas
├── uploads/             # File uploads directory
├── .env.local          # Environment variables
├── server.js           # Main server file
└── package.json        # Dependencies and scripts
```

## 🔄 Next Phase

Phase 2 will include:
- Property management endpoints
- File upload handling for property images
- Advanced user role management
- Property search and filtering

## 🐛 Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Check DATABASE_URL in .env.local
3. Verify database exists and credentials are correct

### Prisma Client Issues
```bash
npm run prisma:generate
```

### Migration Issues
```bash
npm run prisma:migrate
```

## 📞 Support

For issues related to Phase 1 implementation, check:
1. Database connection and migrations
2. Environment variable configuration
3. JWT secret configuration
4. CORS origins for frontend integration