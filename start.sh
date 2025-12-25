#!/bin/sh
set -e

# Run migrations
echo "Running database migrations..."
bun run drizzle-kit migrate --config drizzle.config.prod.ts

# Start the server
echo "Starting server..."
exec bun run .output/server/index.mjs
