# ── Base ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ── Runtime ──────────────────────────────────────────────────────────────
FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY . .

RUN addgroup -S pulsewatch && adduser -S pulsewatch -G pulsewatch
USER pulsewatch

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
