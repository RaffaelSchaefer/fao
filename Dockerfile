# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps

WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS builder

COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

FROM deps AS prod-deps

RUN npm prune --omit=dev \
	&& npm cache clean --force

FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps --chown=node:node /app/package.json ./package.json
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

RUN rm -f ./dist/public/assets/*.map

USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD node -e "const http = require('node:http'); const port = process.env.PORT || 3000; const req = http.get({ host: '127.0.0.1', port, path: '/' }, (res) => { res.resume(); process.exit(res.statusCode >= 200 && res.statusCode < 500 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.setTimeout(3000, () => { req.destroy(); process.exit(1); });"

CMD ["node", "./dist/server/server.js"]
