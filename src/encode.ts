import { $, spawn } from "bun"

// $`ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 192k output.mp4`;
// Bun.file().stream()

// export function audioArgs(options?: FfmpegAudioOptions) {
//   if (!options) {
//     return []
//   }

//   const { codec, bitrate, channels, sampleRate, quality, metadata } = options

//   return [
//     ...(codec ? ["-acodec", codec] : []),
//     ...(bitrate ? ["-b:a", bitrate] : []),
//     ...(channels ? ["-ac", channels.toString()] : []),
//     ...(sampleRate ? ["-ar", sampleRate.toString()] : []),
//     ...(quality ? ["-q:a", quality.toString()] : []),
//     ...(metadata
//       ? Object.entries(metadata).flatMap(([key, value]) => [
//           "-metadata",
//           `${key}=${value}`,
//         ])
//       : []),
//   ]
// }

export function streamToMp3({
  args,
  input,
  signal,
}: {
  args: string[]
  input: ReadableStream<Uint8Array<ArrayBufferLike>>
  signal?: AbortSignal
}) {
  const proc = spawn({
    cmd: [
      "ffmpeg",
      "-i",
      "pipe:0",
      "-f",
      "mp3", // output as MP3
      "-metadata",
      `TLEN=${60 * 1000}`,
      "-acodec",
      "mp3",
      "-q:a",
      "1",
      "pipe:1",
    ],
    stderr: "pipe",
    stdin: input,
    stdout: "pipe",
    signal: signal,
    onExit: (code) => {
      console.log(`FFmpeg process exited with code ${code}`)
    },
  })

  return proc.stdout
}
