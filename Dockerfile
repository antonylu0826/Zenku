# ─── Builder stage ────────────────────────────────────────────────────────────
FROM oven/bun:1 AS builder
WORKDIR /app

# Install dependencies (cached unless package.json changes)
COPY package.json bun.lock bunfig.toml ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
COPY packages/mcp/package.json packages/mcp/
RUN bun install

# Copy source + generate (zenstack must run before client build)
COPY . .
COPY schema.production.zmodel schema.zmodel
RUN bunx zenstack generate

# Build client (after zenstack so generated types are available)
RUN cd packages/client && bun run build

# ─── Runner stage ─────────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/server ./packages/server
COPY --from=builder /app/packages/core ./packages/core
COPY --from=builder /app/packages/client/dist ./packages/client/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "bunx prisma db push && bun run packages/server/src/seed.ts && bun --watch packages/server/src/index.ts"]
