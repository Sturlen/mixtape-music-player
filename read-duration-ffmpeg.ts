import { $ } from "bun"

import path from "path"

const source = path.join(
  __dirname,
  "demo-music",
  "Kevin MacLeod",
  "Royalty Free",
  "Metalmania.mp3",
)

const duration =
  await $`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${source}`.text()

console.log(duration)
