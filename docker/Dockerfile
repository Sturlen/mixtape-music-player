
FROM oven/bun:1.3-debian
WORKDIR /app
COPY . /app/

RUN bun install --frozen-lockfile --production
RUN bun run build

ENV NODE_ENV=production
EXPOSE 3000
USER bun

CMD ["bun", "run", "start"]