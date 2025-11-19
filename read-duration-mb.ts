import {
  ALL_FORMATS,
  FilePathSource,
  Input,
  ReadableStreamSource,
} from "mediabunny"

import path from "path"

const source = new FilePathSource(
  path.join(
    __dirname,
    "demo-music",
    "Kevin MacLeod",
    "Royalty Free",
    "Metalmania.mp3",
  ),
)

const input = new Input({ formats: ALL_FORMATS, source })

const duration = await input.computeDuration()

console.log(duration)
