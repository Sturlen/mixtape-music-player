import path from "path"
import { describe, test, expect } from "bun:test"
import { FfprobeMetadataProvider } from "../src/server/audio/providers/ffprobe"
import { MediabunnyMetadataProvider } from "../src/server/audio/providers/mediabunny"
import { createMetadataProvider } from "../src/server/audio/factory"
import { AudioError } from "../src/server/audio"
import type { AudioMetadataProvider } from "../src/server/audio"

const DEMO = path.resolve(__dirname, "../demo-music/Kevin MacLeod/Royalty Free")

type FieldName = "trackName" | "artistName" | "albumArtistName" | "albumName"

type Expected = {
  trackName?: string | null
  artistName?: string | null
  albumArtistName?: string | null
  albumName?: string | null
  duration: number
}

type Case = {
  filename: string
  expected: Expected
}

function testCase(provider: AudioMetadataProvider, c: Case) {
  test(`${provider.name} — ${c.filename}`, async () => {
    const info = await provider.getMetadata(path.join(DEMO, c.filename))

    expect(info.provider).toBe(provider.name)

    for (const field of ["trackName", "artistName", "albumArtistName", "albumName"] as FieldName[]) {
      const val = c.expected[field]
      if (val === null) {
        expect(info[field]).toBeUndefined()
      } else if (val !== undefined) {
        expect(info[field]).toBe(val)
      }
    }

    expect(info.durationSeconds.toJSON()).toBeCloseTo(c.expected.duration, 0)
  })
}

function testError(provider: AudioMetadataProvider) {
  test(`${provider.name} — nonexistent file throws AudioError`, async () => {
    try {
      await provider.getMetadata("/nonexistent/file.mp3")
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(AudioError)
      expect((e as AudioError).provider).toBe(provider.name)
    }
  })
}

const mp3Cases: Case[] = [
  {
    filename: "Cool Rock.mp3",
    expected: { trackName: "Cool Rock", artistName: "Kevin MacLeod", albumArtistName: null, albumName: "Royalty Free", duration: 209.38 },
  },
  {
    filename: "Metalmania.mp3",
    expected: { trackName: "Metalmania", artistName: "Kevin MacLeod", albumArtistName: null, duration: 190.46 },
  },
]

const flacCases: Case[] = [
  {
    filename: "Metalmania.flac",
    expected: { trackName: "Metalmania", artistName: "Kevin MacLeod", albumArtistName: null, duration: 190.46 },
  },
]

describe("FfprobeMetadataProvider", () => {
  const p = new FfprobeMetadataProvider()
  for (const c of [...mp3Cases, ...flacCases]) testCase(p, c)
  testError(p)
})

describe("MediabunnyMetadataProvider", () => {
  const p = new MediabunnyMetadataProvider()
  for (const c of flacCases) testCase(p, c)

  test(`${p.name} — Cool Rock.mp3`, async () => {
    const info = await p.getMetadata(path.join(DEMO, "Cool Rock.mp3"))
    expect(info.provider).toBe(p.name)
    expect(info.trackName).toBe("Cool Rock")
    expect(info.artistName).toBe("Kevin MacLeod")
    expect(info.albumArtistName).toBeUndefined()
    expect(info.albumName).toBe("Royalty Free")
    expect(info.durationSeconds.toJSON()).toBeCloseTo(209.38, 0)
  })

  test(`${p.name} — Metalmania.mp3 (ID3v2.2)`, async () => {
    const info = await p.getMetadata(path.join(DEMO, "Metalmania.mp3"))
    expect(info.provider).toBe(p.name)
    expect(info.trackName).toBe("Metalmania")
    expect(info.artistName).toBe("Kevin MacLeod")
    expect(info.albumArtistName).toBeUndefined()
    expect(info.durationSeconds.toJSON()).toBeCloseTo(190.46, 0)
  })

  testError(p)
})

describe("factory", () => {
  test("creates ffprobe provider when ffprobe available", () => {
    const provider = createMetadataProvider()
    expect(provider.name).toBe("ffprobe")
  })
})
