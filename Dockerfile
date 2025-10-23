FROM node:24-slim

WORKDIR /app

COPY app/ app/
COPY components/ components/
COPY drizzle/ drizzle/
COPY lib/ lib/
COPY public/ public/
COPY scripts/ scripts/

COPY components.json \
     drizzle.config.ts \
     instrumentation.ts \
     next.config.js \
     package.json \
     pnpm-lock.yaml \
     postcss.config.js \
     tsconfig.json \
     ./

RUN npm install --global corepack@latest
RUN corepack enable pnpm
RUN corepack use pnpm@latest-10
RUN pnpm install --frozen-lockfile

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]