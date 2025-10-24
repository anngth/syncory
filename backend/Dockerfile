# Development stage
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:dev"]

# Production build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install curl for healthcheck
RUN apk add --no-cache curl

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN mkdir -p uploads && chown -R node:node uploads

USER node

EXPOSE 3001

CMD ["node", "dist/main"]
