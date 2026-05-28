# syntax=docker/dockerfile:1

# ---- Stage 1: build the React client ----
FROM node:22-bookworm-slim AS client-build
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Same-origin API path so the built app calls the Express server that serves it.
ENV VITE_API_BASE=/api
RUN npm run build

# ---- Stage 2: server runtime (serves the API + the built client) ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# Install production deps. python3/make/g++ are a fallback for building the
# native modules (better-sqlite3, bcrypt) when a prebuilt binary isn't available;
# they are removed afterwards to keep the image small.
COPY server/package.json server/package-lock.json ./
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && npm ci --omit=dev \
 && apt-get purge -y python3 make g++ \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

# Server source
COPY server/ ./
# Built client, served as static files by Express
COPY --from=client-build /client/dist ./public

# SQLite database lives here — mount a volume at /app/data to persist it.
RUN mkdir -p /app/data
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/app/data/chores.db \
    CLIENT_DIST=/app/public

EXPOSE 3001
CMD ["node", "server.js"]
