# syntax=docker/dockerfile:1

# Build stage - install deps and compile assets
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

# dart-sass (the "sass" package) is pure JS — no native build tools needed
RUN npm ci

COPY . ./
RUN npm run build && npm prune --production

# Runtime stage - minimal Alpine image
FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Cap V8 heap so Node doesn't overcommit on a small VPS
ENV NODE_OPTIONS="--max-old-space-size=256"

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "./dist/server/server.js"]
