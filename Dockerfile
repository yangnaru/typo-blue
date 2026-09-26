FROM node:24-slim AS build

WORKDIR /app

RUN npm install --global corepack@latest
RUN corepack enable pnpm

# The dependencies before the sources, so that a change to the sources alone
# reuses the installed node_modules from the cache.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack install
RUN pnpm install --frozen-lockfile

COPY app/ app/
COPY components/ components/
COPY drizzle/ drizzle/
COPY lib/ lib/
COPY public/ public/
COPY scripts/ scripts/

COPY components.json \
     drizzle.config.ts \
     instrumentation.ts \
     instrumentation-client.ts \
     next.config.js \
     postcss.config.js \
     sentry.edge.config.ts \
     sentry.server.config.ts \
     tsconfig.json \
     ./

ARG NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_DOMAIN
ARG NEXT_PUBLIC_R2_PUBLIC_URL
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL
ENV NEXT_PUBLIC_DOMAIN=$NEXT_PUBLIC_DOMAIN
ENV NEXT_PUBLIC_R2_PUBLIC_URL=$NEXT_PUBLIC_R2_PUBLIC_URL

RUN pnpm run build

# One file with drizzle-orm and pg inside, so migrating needs neither
# drizzle-kit nor node_modules. pg-native is an optional pg backend we do not
# install. The banner gives pg, which is CommonJS, the `require` that an ES
# module bundle lacks.
RUN pnpm exec esbuild scripts/migrate.ts --bundle --platform=node \
      --format=esm --external:pg-native --outfile=migrate.mjs \
      "--banner:js=import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);"


# Only what `node server.js` reads: the traced server, its static assets, and
# the migrations with their runner.
FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Declared again here because they are what deploy.py reads off the image to
# check it was built for the server's .env.
ARG NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_DOMAIN
ARG NEXT_PUBLIC_R2_PUBLIC_URL
ENV NEXT_PUBLIC_URL=$NEXT_PUBLIC_URL
ENV NEXT_PUBLIC_DOMAIN=$NEXT_PUBLIC_DOMAIN
ENV NEXT_PUBLIC_R2_PUBLIC_URL=$NEXT_PUBLIC_R2_PUBLIC_URL

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static .next/static
COPY --from=build --chown=node:node /app/public public
COPY --from=build --chown=node:node /app/drizzle/meta drizzle/meta
COPY --from=build --chown=node:node /app/drizzle/*.sql drizzle/
COPY --from=build --chown=node:node /app/migrate.mjs ./

USER node

EXPOSE 3000

CMD ["node", "server.js"]
