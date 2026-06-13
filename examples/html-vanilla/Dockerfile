FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
COPY packages/embed/package.json packages/embed/
COPY examples/html-vanilla/package.json examples/html-vanilla/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/server packages/server
COPY packages/client packages/client
COPY packages/embed packages/embed
COPY examples/html-vanilla examples/html-vanilla

# Build packages
RUN pnpm --filter @eudi-verify/server build && \
    pnpm --filter @eudi-verify/client build && \
    pnpm --filter @eudi-verify/embed build

# Production stage
FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built packages and demo
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder /app/packages packages
COPY --from=builder /app/examples/html-vanilla examples/html-vanilla

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

WORKDIR /app/examples/html-vanilla

EXPOSE 3000

CMD ["node", "--import", "tsx", "server.ts"]
