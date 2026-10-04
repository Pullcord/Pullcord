# Node 22 pinned to an exact patch release (tag checked on Docker Hub 2026-10-04).
FROM node:22.23.2-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# packages/notify is a local file: dependency, so it must exist before npm ci.
COPY package.json package-lock.json ./
COPY packages ./packages
RUN npm ci --omit=dev

COPY src ./src

# Fly mounts volumes owned by root. Start as root only to hand /data to the
# node user, then drop privileges for the server process.
EXPOSE 8080
CMD ["sh", "-c", "mkdir -p /data && chown node:node /data && exec setpriv --reuid=node --regid=node --init-groups node src/server.js"]
