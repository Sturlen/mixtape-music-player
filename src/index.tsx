import { serve } from "bun"
import index from "./index.html"

import { readdir } from "node:fs/promises"
import path, { join } from "node:path"
join

const music_exts = ["mp3", "flac"] as const
const art_exts = ["jpeg", "png", "webp"] as const

const dir_path = "\\\\Swisscheese\\plex\\Library\\mp3\\Ghost\\"

// read all the files in the current directory
const file_strings = await readdir(dir_path, { recursive: true })
const files = file_strings.map((x) => Bun.file(x))

files.forEach(console.log)
const split_files = file_strings.map((x) => x.split(path.sep))
const albums = Object.groupBy(file_strings, (arr) => arr.split(path.sep)[0])
console.log(albums)

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        })
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        })
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name
      return Response.json({
        message: `Hello, ${name}!`,
      })
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
})

console.log(`🚀 Server running at ${server.url}`)
