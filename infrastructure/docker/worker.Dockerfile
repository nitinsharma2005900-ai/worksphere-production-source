FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN apk add --no-cache curl
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci --only=production
COPY backend/dist ./dist

USER appuser

CMD ["node", "dist/jobs/worker.js"]
