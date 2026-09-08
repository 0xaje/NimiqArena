# Multi-stage production build for Nimiq Arena
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy dependency specifications
COPY package.json pnpm-lock.yaml patches ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build Vite client and esbuild server bundle
RUN pnpm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN npm install -g pnpm@10.4.1

# Copy package specs and install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
