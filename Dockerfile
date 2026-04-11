# Stage 1: Install client dependencies
FROM oven/bun:latest AS client-deps
WORKDIR /app/src/client
COPY src/client/package.json src/client/bun.lockb* ./
RUN bun install --frozen-lockfile

# Stage 2: Build React client
FROM oven/bun:latest AS builder
WORKDIR /app
COPY --from=client-deps /app/src/client/node_modules ./src/client/node_modules
COPY src/client/ ./src/client/
COPY src/ ./src/
COPY tsconfig.json package.json ./
# Build the React client (outputs to dist/client/)
RUN cd src/client && bun run build

# Stage 3: Runtime — minimal image with server + data
FROM oven/bun:latest AS runner
WORKDIR /app

# Copy source for Bun's runtime (no transpile needed)
COPY --from=builder /app/src ./src
COPY --from=builder /app/dist/client ./dist/client
COPY tsconfig.json package.json ./

# Copy data files (pre-built with 2010-2026 draws)
COPY data/ ./data/

EXPOSE 3000
ENV PORT=3000

CMD ["bun", "src/server/index.ts"]
