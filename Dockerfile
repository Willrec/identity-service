# ──────────────────────────────────────────────
# Stage 1: builder
# ──────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY prisma ./prisma
RUN pnpm prisma generate

COPY src ./src
RUN pnpm build

# Prune devDependencies so runner copies only prod deps
RUN pnpm prune --prod

# ──────────────────────────────────────────────
# Stage 2: runner
# ──────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy pruned node_modules (prod-only, Prisma client already generated)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3000

# Hardcoded port — avoids env var expansion issues in HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
