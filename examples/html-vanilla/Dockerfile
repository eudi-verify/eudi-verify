FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
COPY packages/embed/package.json packages/embed/
COPY examples/server/package.json examples/server/
COPY examples/html-vanilla/package.json examples/html-vanilla/

RUN pnpm install --frozen-lockfile

COPY packages/server packages/server
COPY packages/client packages/client
COPY packages/embed packages/embed
COPY examples/server examples/server
COPY examples/html-vanilla examples/html-vanilla

RUN pnpm --filter @eudi-verify/server build && \
    pnpm --filter @eudi-verify/client build && \
    pnpm --filter @eudi-verify/embed build

FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder /app/packages packages
COPY --from=builder /app/examples/server examples/server
COPY --from=builder /app/examples/html-vanilla examples/html-vanilla

RUN pnpm install --frozen-lockfile --prod && \
    chmod +x examples/html-vanilla/docker-entrypoint.sh

ENV PORT=3001
ENV API_PORT=3000

EXPOSE 3001

WORKDIR /app/examples/html-vanilla

CMD ["./docker-entrypoint.sh"]
