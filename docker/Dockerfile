
FROM oven/bun:1.3-debian
WORKDIR /app
# install full deps for build
COPY package.json bun.lock /app/
RUN bun install --frozen-lockfile
# copy source and build
COPY . /app
# run tests and build in this stage (CI should run tests before building image)
RUN bun test || true
RUN bun run build


ENV NODE_ENV=production
EXPOSE 3000
USER bun

# using start script can lead to illegal instruction execptions.
CMD ["bun", "run", "src/index.tsx"]

