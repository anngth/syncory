# Syncory Backend

Enterprise-grade NestJS backend with MongoDB, Socket.io, and comprehensive features.

## Features

- ✅ JWT Authentication with refresh tokens
- ✅ MongoDB with Mongoose ODM
- ✅ Redis caching and session management
- ✅ Socket.io for real-time communication
- ✅ File uploads (Local/S3/Cloudinary)
- ✅ Email service (Nodemailer/SendGrid)
- ✅ Full-text message search
- ✅ Swagger API documentation
- ✅ Rate limiting
- ✅ Comprehensive error handling
- ✅ Docker support

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 7.0+
- Redis 7.2+
- (Optional) AWS S3 or Cloudinary account
- (Optional) SendGrid or SMTP credentials

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Running Locally

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Running with Docker

```bash
# From project root
docker-compose up -d backend
```

## Environment Variables

See `.env.example` for all required variables.

### Required:
- `MONGODB_URI` - MongoDB connection string
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis configuration
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT secrets

### Optional:
- AWS S3 credentials
- Cloudinary credentials
- Email service credentials

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:3001/api/docs
- Health check: http://localhost:3001/health

## Project Structure

```
src/
├── auth/           # Authentication module
├── users/          # User management
├── workspaces/     # Workspace management
├── channels/       # Channel management
├── messages/       # Message handling
├── files/          # File uploads
├── email/          # Email service
├── gateway/        # Socket.io gateways
├── common/         # Shared utilities
└── config/         # Configuration
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## License

MIT
