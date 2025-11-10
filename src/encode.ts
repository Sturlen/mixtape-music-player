import { spawn } from "bun"

export function streamToMp3({
  args,
  input,
  signal,
  duration,
}: {
  args: string[]
  input: ReadableStream<Uint8Array<ArrayBufferLike>>
  signal?: AbortSignal
  duration: number
}) {
  const proc = spawn({
    cmd: [
      "ffmpeg",
      "-i",
      "pipe:0",
      "-f",
      "mp3",
      "-acodec",
      "libmp3lame",
      "-q:a",
      "1",
      "-hide_banner",
      "-loglevel",
      "error",
      "pipe:1",
    ],
    stderr: "pipe",
    stdin: "pipe",
    stdout: "pipe",
    signal: signal,
  })

  // Manually pump input to stdin
  ;(async () => {
    const reader = input.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        proc.stdin.write(value)
      }
    } finally {
      proc.stdin.end()
      reader.releaseLock()
    }
  })()

  const id3Tag = createId3v2Tag(duration)

  return new ReadableStream({
    async start(controller) {
      controller.enqueue(id3Tag)

      for await (const chunk of proc.stdout) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })
}

function createId3v2Tag(durationMs: number): Uint8Array {
  const tlenFrame = createTLENFrame(durationMs)
  const tagSize = tlenFrame.length

  const tag = new Uint8Array(10 + tlenFrame.length)
  tag.set([0x49, 0x44, 0x33], 0) // "ID3"
  tag[3] = 0x03 // version 2.3
  tag[4] = 0x00
  tag[5] = 0x00 // flags
  tag.set(encodeSynchSafeInt(tagSize), 6)
  tag.set(tlenFrame, 10)

  return tag
}

function createTLENFrame(durationMs: number): Uint8Array {
  const text = durationMs.toString()
  const frame = new Uint8Array(10 + text.length)
  frame.set([0x54, 0x4c, 0x45, 0x4e], 0) // "TLEN"
  frame.set(encodeSynchSafeInt(text.length + 1), 4)
  frame[8] = 0x00 // flags
  frame[9] = 0x00 // text encoding
  frame.set(new TextEncoder().encode(text), 10)

  return frame
}

function encodeSynchSafeInt(num: number): Uint8Array {
  return new Uint8Array([
    (num >> 21) & 0x7f,
    (num >> 14) & 0x7f,
    (num >> 7) & 0x7f,
    num & 0x7f,
  ])
}
