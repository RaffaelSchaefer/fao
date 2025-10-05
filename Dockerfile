# syntax=docker/dockerfile:1

# Build stage - install deps and compile assets
FROM node:14-bullseye AS builder

WORKDIR /app

COPY package*.json ./

# node-sass needs build tooling and Python 2 for arm64
RUN apt-get update \
    && apt-get install -y python2 make g++ \
    && npm config set python /usr/bin/python2 \
    && npm install \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY . ./
RUN npm run build

# Remove dev dependencies; keep only what runtime needs
RUN npm prune --production

# Runtime stage - copy build artifacts and production deps
FROM node:14-bullseye-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "./dist/server/server.js"]