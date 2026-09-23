# ---- Base image ----
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# ---- Dependencies ----
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src/lib/migrations ./src/lib/migrations

# Install dependencies
RUN npm ci --legacy-peer-deps --prefer-offline --no-audit

# Generate Prisma Client
RUN npx prisma generate

# ---- Migration stage (minimal — faqat prisma migrate + custom migrations) ----
FROM base AS migration
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src/lib/migrations ./src/lib/migrations
COPY tsconfig.json ./
# Use the exact lockfile-resolved Prisma/toolchain already installed by deps.
COPY --from=deps /app/node_modules ./node_modules

# ---- Builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Har bir commitda build cache buzilsin, yangi kod image'ga kirsin
ARG COMMIT_SHA
RUN echo "${COMMIT_SHA:-unknown}" > .build-sha

# Build environment variables
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Build Next.js application
RUN npm run build

# ---- Production runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apk add --no-cache openssl
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy package.json for prisma commands
COPY --from=builder /app/package.json ./package.json
# Build commit (CI da yoziladi) — /api/version tekshirish uchun
COPY --from=builder /app/.build-sha ./.build-sha

RUN mkdir -p /app/uploads/company-receipts && chown -R nextjs:nextjs /app/uploads

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]