FROM ghcr.io/linuxserver/baseimage-alpine:3.24

# setup bun and ffmpeg
RUN \
    curl -fsSL https://bun.com/install | bash && \
    cp /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /usr/local/bin/bun /usr/local/bin/bunx && \
    apk add --no-cache ffmpeg

WORKDIR /app
# install full deps for build
COPY package.json bun.lock /app/
RUN bun install --frozen-lockfile

# copy source and build
COPY . /app
RUN rm -f /app/.env* && bun run build

# add s6 service files
COPY root/ /

ENV NODE_ENV=production
ENV DATA_PATH=/config
ENV MUSIC_PATH=/data/music
ENV MUSIC2_PATH=
ENV PORT=3000
ENV USE_FFMPEG=false
ENV MIXTAPES_ENABLED=false
ENV OTEL_EXPORTER_OTLP_ENDPOINT=
ENV OTEL_EXPORTER_OTLP_HEADERS=
ENV OTEL_SERVICE_NAME=mixtape
ENV PG_PORT=0
ENV HLS_ENABLED=false
ENV HLS_CACHE_DIR=

EXPOSE 3000
VOLUME ["/data", "/config"]
