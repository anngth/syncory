# Syncory Setup Guide

This guide walks you through configuring, running, and deploying the Syncory stack for local development and production environments.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (recommended)
- MongoDB 7.0+
- Redis 7.2+
- (Optional) AWS account for S3
- (Optional) Cloudinary account
- (Optional) SendGrid account or SMTP server

## Quick Start with Docker (Recommended)

### 1. Clone and Configure

```bash
git clone <your-repo-url> syncory
cd syncory

# Create environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 2. Configure Environment Variables

Edit the `.env` files with your credentials:

- **Root `.env`**: MongoDB, Redis, JWT secrets, file storage, and email configuration.
- **`backend/.env`**: Same as root but suited for local development defaults.
- **`frontend/.env.local`**:
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:3001
  NEXT_PUBLIC_WS_URL=http://localhost:3001
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```

### 3. Start Services

```bash
# Start MongoDB, Redis, backend, and frontend
docker-compose up -d

# Follow logs
docker-compose logs -f

# Shut down
docker-compose down
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Swagger docs: http://localhost:3001/api/docs
- Health check: http://localhost:3001/health
- **WebSocket namespaces**: `/chat`, `/presence`, `/typing` (proxied through port `3001`)

### 5. Docker Services & Ports

| Container          | Purpose                  | Port Mapping |
|--------------------|--------------------------|--------------|
| `syncory-mongodb`  | MongoDB primary database | `27017:27017` |
| `syncory-redis`    | Redis cache and queues   | `6379:6379`   |
| `syncory-backend`  | NestJS API + WebSockets  | `3001:3001`   |
| `syncory-frontend` | Next.js web client       | `3000:3000`   |

### 6. Health & Monitoring

- `GET /health` exposes uptime and status for liveness probes.
- `GET /api/docs` serves Swagger UI; `GET /api/docs-json` returns the OpenAPI schema.
- Inspect Redis with `docker exec -it syncory-redis redis-cli INFO`.
- Inspect MongoDB with `docker exec -it syncory-mongodb mongosh --eval "db.stats()"`.
- Socket metrics can be observed with `docker logs syncory-backend | grep Gateway`.

## Manual Setup (Without Docker)

### Backend

```bash
cd backend
npm install

# Start MongoDB and Redis locally if needed
mongod --dbpath /path/to/data
redis-server

# Start the backend server
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Configuration Reference

### Environment Variables

**Root `.env` (production secrets)**

- `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`: bootstrap credentials for the MongoDB container.
- `REDIS_PASSWORD`: password shared between Redis and backend clients.
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION`: signing keys and lifetimes for access/refresh tokens.
- `CORS_ORIGIN`: comma-separated list of trusted frontend origins.
- `FILE_UPLOAD_PROVIDER`, `MAX_FILE_SIZE`: select storage adapter and enforce global upload limits.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_S3_REGION`: S3 credentials if `FILE_UPLOAD_PROVIDER=s3`.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Cloudinary credentials if `FILE_UPLOAD_PROVIDER=cloudinary`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SENDGRID_API_KEY`, `EMAIL_PROVIDER`, `EMAIL_FROM`: transactional email configuration.
- `FRONTEND_URL`: canonical frontend URL used in email templates and redirects.

**`backend/.env`**

- `NODE_ENV`, `PORT`: runtime mode and listening port (defaults to `development` and `3001`).
- `MONGODB_URI`: connection string; default points to the `syncory` database.
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: cache connection details.
- `FILE_UPLOAD_PROVIDER`, `MAX_FILE_SIZE`: mirror production settings.
- `EMAIL_PROVIDER`, `SMTP_*`, `SENDGRID_API_KEY`, `EMAIL_FROM`: email driver selection and credentials.
- `FRONTEND_URL`: used for CORS, password reset links, and socket handshake validation.

**`frontend/.env.local`**

- `NEXT_PUBLIC_API_URL`: REST endpoint exposed by the backend.
- `NEXT_PUBLIC_WS_URL`: WebSocket endpoint (include protocol `http`/`https` as appropriate).
- `NEXT_PUBLIC_APP_URL`: public URL of the frontend (used in invites and OAuth flows).

> Maintain parity between environments to avoid CORS or WebSocket mismatches when promoting builds.

### File Upload Providers

Set the `FILE_UPLOAD_PROVIDER` environment variable:

- Local storage (development):
  ```env
  FILE_UPLOAD_PROVIDER=local
  ```
- AWS S3 (production):
  ```env
  FILE_UPLOAD_PROVIDER=s3
  AWS_ACCESS_KEY_ID=your_key
  AWS_SECRET_ACCESS_KEY=your_secret
  AWS_S3_BUCKET=your_bucket
  AWS_S3_REGION=us-east-1
  ```
- Cloudinary:
  ```env
  FILE_UPLOAD_PROVIDER=cloudinary
  CLOUDINARY_CLOUD_NAME=your_cloud
  CLOUDINARY_API_KEY=your_key
  CLOUDINARY_API_SECRET=your_secret
  ```

Set `MAX_FILE_SIZE` (bytes) to cap uploads (default `10 MB`).

### Email Providers

Choose one via `EMAIL_PROVIDER`:

- Nodemailer (SMTP):
  ```env
  EMAIL_PROVIDER=nodemailer
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=your-email@gmail.com
  SMTP_PASSWORD=your-app-password
  EMAIL_FROM=noreply@yourdomain.com
  ```
- SendGrid (production):
  ```env
  EMAIL_PROVIDER=sendgrid
  SENDGRID_API_KEY=your_api_key
  EMAIL_FROM=noreply@yourdomain.com
  ```

Transactional templates live under `backend/src/email/services` and can be branded to match your organization.

### Cache & Queue Infrastructure

- Redis powers caching, presence tracking, typing indicators, and Bull queues.
- Inspect cache keys (`workspace:*`, `channel:*`, `typing:*`) with `redis-cli KEYS`.
- Bull is configured globally; register queues with `BullModule.registerQueue` when adding background processors.

## Deployment

### Backend (VPS/Cloud)

```bash
# Build and push image
docker build -t syncory-backend ./backend

# Run production stack
docker-compose -f docker-compose.prod.yml up -d
```

### Frontend (Vercel)

```bash
cd frontend
npm install -g vercel
vercel deploy --prod
```

Remember to configure environment variables in the Vercel dashboard.

## Scaling & Production Considerations

- **Horizontal scaling**: Run multiple `syncory-backend` replicas behind a load balancer; they share Redis for socket coordination.
- **Managed databases**: Swap the MongoDB container for MongoDB Atlas/DocumentDB and update `MONGODB_URI`; apply TLS and IP allowlists.
- **Storage**: Serve uploaded assets via CDN-enabled S3 buckets or Cloudinary delivery URLs.
- **TLS termination**: Terminate HTTPS at a proxy (nginx, ALB, Traefik) and update `CORS_ORIGIN`/`FRONTEND_URL` to `https`.
- **Backups**: Schedule automated MongoDB dumps and Redis snapshots; store them in encrypted object storage.
- **Monitoring**: Forward NestJS logs to your observability stack and alert on 5xx rates, queue depth, and Redis latency.
- **Disaster recovery**: Practice restoring from snapshots and verifying JWT secret rotation procedures.

## Testing

- **Backend**
  ```bash
  cd backend
  npm run test
  npm run test:e2e
  npm run test:cov
  ```
- **Frontend**
  ```bash
  cd frontend
  npm run test
  ```

## Operations Tips

- **Hot reload** is available for backend and frontend in development mode.
- **API testing**: Swagger UI at `http://localhost:3001/api/docs`.
- **Database access**:
  ```bash
  docker exec -it syncory-mongodb mongosh -u admin -p admin123
  docker exec -it syncory-redis redis-cli -a redis123
  ```
- **Logs**:
  ```bash
  docker-compose logs -f backend
  docker-compose logs -f frontend
  docker-compose logs -f
  ```
- **Queues**: Inspect Bull queues via Redis CLI (`keys bull:*`) or by instrumenting a UI (e.g., bull-board).
- **Presence & typing**: Keys prefixed with `presence:` and `typing:` hold transient Socket.IO state; TTL is managed automatically.
- **Swagger smoke test**: `curl http://localhost:3001/api/docs-json | jq '.info.version'` to verify API availability.

## Troubleshooting

- **Port collisions** (`3000` or `3001`):
  ```bash
  lsof -ti:3000 | xargs kill -9
  lsof -ti:3001 | xargs kill -9
  ```
- **MongoDB issues**: Ensure the container is healthy (`docker ps`), credentials match, and the `syncory` database exists.
- **Socket.io issues**: Verify `CORS_ORIGIN`, load balancer WebSocket support, and that clients pass a JWT in the handshake.
- **File upload problems**: Check provider credentials, bucket permissions, and `MAX_FILE_SIZE`.
- **Email delivery**: Confirm SPF/DKIM setup, verify API keys, and inspect backend logs for provider-specific errors.
- **Presence/typing drift**: Ensure Redis is reachable; clear transient keys with `redis-cli FLUSHDB` if debugging locally.
- **Docker resource limits**: Increase Docker Desktop CPU/RAM if MongoDB or Next.js builds restart unexpectedly.

## Next Steps

- Create an admin user using the registration endpoint after the first launch.
- Review `docs/overview.md` for architecture and feature details.
- Brand email templates and notification preferences to match your organization.
- Configure monitoring/alerting on `/health`, queue depth, and Redis availability before production rollout.
- Document your workspace role policies (Owner/Admin/Member/Guest) and distribute them to tenant administrators.
