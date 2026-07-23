FROM node:22-alpine AS deps
WORKDIR /app
COPY api/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY api/src ./src
COPY api/package.json ./
COPY web ../web
USER app
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "src/server.js"]
