# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for node-gyp and other builds
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy \
    MEDUSA_ADMIN_ONBOARDING_TYPE=default \
    npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install Medusa CLI globally to run migrations
RUN npm install -g @medusajs/cli@2.13.6

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.medusa ./.medusa
COPY --from=builder /app/medusa-config.js ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma_products.json ./
COPY --from=builder /app/vite.config.js ./

# Create a non-root user for security
RUN addgroup -S medusa && adduser -S medusa -G medusa
RUN chown -R medusa:medusa /app
USER medusa

EXPOSE 9000

CMD ["medusa", "start"]
