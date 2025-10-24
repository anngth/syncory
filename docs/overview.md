# Syncory Documentation

## Overview
Syncory is an enterprise-grade team communication and collaboration platform designed for modern product teams. It bundles secure messaging, channel-based conversations, file sharing, and powerful real-time capabilities into a single application that scales with your organization.

## Project Layout
```
syncory/
├── backend/                 # NestJS backend (REST, WebSockets, queues)
│   ├── src/
│   │   ├── auth/            # Authentication module
│   │   ├── users/           # Users module
│   │   ├── workspaces/      # Workspaces module
│   │   ├── channels/        # Channels module
│   │   ├── messages/        # Messages module
│   │   ├── files/           # File upload module
│   │   ├── gateway/         # Socket.io gateway
│   │   ├── email/           # Email service abstraction
│   │   ├── common/          # Shared utilities
│   │   └── config/          # Application configuration
│   ├── Dockerfile
│   └── package.json
├── frontend/                # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # Reusable UI
│   │   ├── lib/             # Client utilities
│   │   ├── hooks/           # Custom hooks
│   │   ├── stores/          # Zustand stores
│   │   └── types/           # Shared TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docs/                    # Product documentation
├── docker-compose.yml       # Development stack
├── docker-compose.prod.yml  # Production stack
└── README.md
```

## Tech Stack

### Backend
- **NestJS** with TypeScript
- **MongoDB** via Mongoose ODM
- **Socket.io** for WebSockets
- **Redis** for caching, queues, and sessions
- **Bull** for background jobs
- **JWT** with refresh tokens
- **AWS S3 & Cloudinary** for file storage abstraction
- **Nodemailer & SendGrid** for transactional email delivery

### Frontend
- **Next.js 14+** with the App Router
- **TypeScript** for type-safe React
- **TailwindCSS** for styling
- **shadcn/ui** component primitives
- **Zustand** for client-side state management
- **Socket.io Client** for real-time updates

### DevOps
- **Docker** images for every service
- **Docker Compose** orchestration
- **Vercel** for frontend hosting
- **VPS/Cloud** friendly backend deployment

## Features

### Core Features
- Workspaces with multi-team support
- Channels (public and private)
- Direct messages (1:1 and group)
- Real-time messaging with typing indicators
- Threaded conversations
- Emoji reactions
- File and image uploads (S3/Cloudinary/local)
- Presence (online/offline/away)
- Profile management with avatars

### Advanced Features
- Full-text search across messages
- Mentions (`@user`, `@channel`, `@here`)
- Email and in-app notifications
- Message editing, deletion, and pinning
- Read receipts
- Rich text formatting with Markdown

### Authentication & Security
- Email/password authentication
- Access and refresh tokens with rotation
- Rate limiting for sensitive endpoints
- Input validation and sanitization
- CORS configuration and Helmet security headers
- Password hashing with bcrypt

## Workspace Governance & Roles

- Role hierarchy with **Owner**, **Admin**, **Member**, and **Guest** levels, enforced across workspace mutations.
- Owners retain exclusive rights to delete workspaces and promote/demote members (`WorkspaceMemberRole`).
- Admins manage membership invites, removals, and workspace metadata.
- Configurable workspace settings (`allowInvites`, `inviteOnly`, `defaultChannelId`) control self-service onboarding and default channel routing.
- Slug generation guarantees stable URLs per workspace while preventing collisions.

## Channel Lifecycle Management

- Channel types include **public**, **private**, **direct**, and **group** conversations with role-aware access control.
- Automatic membership tracking with `joinedAt` and per-member `lastRead` cursors enable unread indicators.
- Archiving and unarchiving flows preserve history while removing channels from active lists.
- Pinning catalogue persisted in MongoDB supports shared context and quick access to important threads.

## Messaging Engine

- Supports multiple message types (`text`, `file`, `image`, `system`) and thread replies.
- Reaction matrix stored per message with optimistic socket updates.
- Soft deletes retain audit trails by flagging `isDeleted` while masking content.
- Full-text search leverages MongoDB indexes with optional filters (channel, sender, date range).
- Pagination utilities (`PaginationDto`) combine with indexes to serve long-running channels efficiently.

## Real-Time Collaboration

- WebSocket namespaces split responsibilities:
  - `/chat` for message delivery, edits, deletions, reactions.
  - `/presence` for online/offline signals, custom status, and workspace-level broadcasting with Redis-backed sets.
  - `/typing` for transient typing indicators with automatic expiry.
- JWT authentication is enforced during socket handshake, reusing REST credentials.
- Presence state persists briefly (5-minute TTL) to smooth client reconnects.
- Channel joins map to Socket.IO rooms to scope broadcasts precisely.

## Notifications & Email

- Transactional email templating provided through Nodemailer (SMTP) and SendGrid drivers.
- Welcome, invite, and password reset templates are branded and sent via the configured provider.
- `EMAIL_PROVIDER` toggles providers at runtime; fallback defaults ensure development friendliness.
- Emails respect `EMAIL_FROM` branding and front-end deep links derived from `FRONTEND_URL`.

## Files & Media Handling

- Abstracted file-upload layer with adapters for local storage, AWS S3, and Cloudinary.
- Default Cloudinary folder slugged as `syncory` to group assets per environment.
- Shared `MAX_FILE_SIZE` guard prevents oversized uploads across providers.
- Metadata persisted alongside messages (file IDs, MIME type, size, optional thumbnails).

## User Profiles & Preferences

- Rich profile model capturing avatar, bio, phone, timezone, and workspace associations.
- Presence statuses (`online`, `offline`, `away`, `dnd`) and optional custom status messages broadcast in real time.
- Notification preferences accommodate email, push, and desktop channels for fine-grained control.
- Theme and language hooks enable UI personalization in the frontend.

## Architecture

### Backend Architecture
- Modular NestJS design with feature-first folders
- Clean Architecture and DDD-inspired boundaries
- Repository pattern for persistence isolation
- Service layer encapsulating business logic
- Data transfer objects with class-validator
- Middleware for cross-cutting concerns (logging, auth)

### Frontend Architecture
- App Router with Server and Client Components
- Reusable UI primitives and custom hooks
- Zustand stores for shared client state
- Optimistic UI patterns for fast interactions
- Socket-driven updates for collaboration features

## Core Services
- **API & Real-Time**: Exposed on port `3001`; Swagger docs available at `/api/docs`.
- **Frontend Application**: Served on port `3000`, consuming REST and WebSocket endpoints.
- **MongoDB (`syncory-mongodb`)**: Primary datastore initialized via `backend/scripts/mongo-init.js`.
- **Redis (`syncory-redis`)**: Supports caching, queues, and session storage.

## Naming Conventions
- Docker containers follow the `syncory-*` prefix (for example, `syncory-backend`, `syncory-frontend`).
- MongoDB uses the `syncory` database in every environment.
- Default transactional email sender aligns with the brand: `noreply@syncory.com`.

## API Surface
- Swagger UI: http://localhost:3001/api/docs
- OpenAPI JSON: http://localhost:3001/api/docs-json

## Security Considerations

- Short-lived access tokens with refresh token rotation
- Password hashing with bcrypt
- Rate limiting on authentication endpoints
- Request validation and sanitization
- CORS configuration tuned for trusted origins
- Helmet-powered HTTP hardening
- Role-based access control and workspace/channel scoped authorization checks
- Soft-delete semantics and audit logging via structured NestJS logger output
- Cached presence/typing state capped with TTLs to limit data exposure

## Performance & Scalability

- Redis caching for frequently accessed data
- MongoDB indexes tuned for query patterns
- CDN-ready asset pipeline
- Image optimization via Next.js
- Lazy loading for non-critical components
- Debounced searches and pagination for large datasets
- Connection pooling across database and cache clients
- Bull + Redis queue infrastructure ready for background jobs and rate smoothing
- Cache invalidation strategies baked into services for write-heavy operations

## Observability & Operations

- Structured application logs emitted through NestJS `Logger`, ready for aggregation.
- `/health` endpoint surfaces uptime and status for use with load balancers and monitors.
- Docker Compose profiles define local (`docker-compose.yml`) and production (`docker-compose.prod.yml`) stacks with isolated networks.
- Cache keys namespace workspace, channel, and presence data to simplify manual inspection via Redis CLI.
- Swagger UI documents the REST surface and doubles as an exploratory tool for QA.

## Additional Resources
- [Setup Guide](./setup.md) — Environment configuration, local development, and deployment.
- Backend and frontend READMEs within their respective folders cover service-specific details.
- API reference available at `/api/docs` once the backend is running.
