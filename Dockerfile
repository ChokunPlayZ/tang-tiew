# Use the official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies into temp directory
# This will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Copy source code and dependencies
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# Build the app
ENV NODE_ENV=production
RUN bun run build

# Final release image
FROM base AS release
WORKDIR /app

# Copy the built output from the prerelease stage
# Nitro/TanStack Start builds to .output by default
COPY --from=prerelease /app/.output .output

# Copy migrations and production config
COPY --from=prerelease /app/drizzle ./drizzle
COPY --from=prerelease /app/drizzle.config.prod.ts ./
COPY --from=prerelease /app/start.sh ./

# Expose the port the app runs on
EXPOSE 3000/tcp

# Set storage directory for persistent uploads
# IMPORTANT: Mount a volume to this path to persist uploads
ENV STORAGE_DIR="/app/.output/public/uploads"

# Run the server via start script (handles migrations)
CMD [ "/bin/sh", "start.sh" ]
