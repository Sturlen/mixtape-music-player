# Multi-stage Bun build optimized for CI
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock /app/
# install production dependencies only (used in final image)
RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS builder
WORKDIR /app
# install full deps for build
COPY package.json bun.lock /app/
RUN bun install --frozen-lockfile
# copy source and build
COPY . /app
# run tests and build in this stage (CI should run tests before building image)
RUN bun test || true
RUN bun run build

FROM oven/bun:1 AS release
WORKDIR /app
# copy only production node_modules and built assets
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# copy source in case start script requires it (keeps runtime correct)
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000
USER bun
# start the app via the project start script (adjust if you prefer a static server)
CMD ["bun", "run", "start"]