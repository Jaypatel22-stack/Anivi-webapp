# Straightforward multi-stage build: one stage builds the app with full
# (dev + prod) dependencies, the final image runs it with prod-only
# dependencies via `next start`. This also means the same image can run
# one-off commands like `node db/migrate.js` or `node db/seed.js`, since
# the whole app + a full production node_modules is present, not just a
# tracing-based subset.

FROM node:20-slim AS base
WORKDIR /app

# ---- deps: everything, for building ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- prod-deps: production-only, for the runtime image ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- builder: compile the app ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The build only needs DATABASE_URL to exist (drizzle.config.js reads it at
# import time); it never actually connects to Postgres during `next build`.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

# ---- runner: minimal production image ----
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/db ./db
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/proxy.js ./proxy.js
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/package.json ./package.json

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

# Migrations run as a separate one-off Render "pre-deploy" / release command
# (see render.yaml and README), not automatically on container start — that
# way a bad migration can't block the app from starting to serve traffic
# that doesn't need it, and you get a clear log of when migrations ran.
CMD ["npm", "run", "start"]
