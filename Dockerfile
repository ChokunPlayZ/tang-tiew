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
# Copy the built output from the prerelease stage
# Nitro/TanStack Start builds to .output by default
COPY --from=prerelease /app/node_modules node_modules
COPY --from=prerelease /app/.output .output

# Copy migrations (needed for src/db/migrate.ts)
COPY --from=prerelease /app/drizzle ./drizzle
COPY --from=prerelease /app/drizzle.config.ts .
COPY --from=prerelease /app/src/db ./src/db

# Expose the port the app runs on
EXPOSE 3000/tcp

# Set storage directory for persistent uploads
# IMPORTANT: Mount a volume to this path to persist uploads
ENV STORAGE_DIR="/app/.output/public/uploads"

# Run the server
CMD [ "bun", "run", ".output/server/index.mjs" ]
