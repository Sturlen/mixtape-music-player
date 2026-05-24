#!/bin/sh
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p /data
  chown bun:bun /data
  exec su-exec bun "$@"
fi

exec "$@"
