import { describe, test, expect } from "bun:test"
import { cn, raise, formatTime, compareTracksByNumberName } from "@/lib/utils"
import type { Track } from "@/lib/types"

describe("cn", () => {
  test("handles single string", () => {
    expect(cn("px-4")).toBe("px-4")
  })

  test("handles multiple strings", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2")
  })

  test("filters falsy values", () => {
    expect(cn("px-4", false, undefined, null, "py-2")).toBe("px-4 py-2")
  })

  test("handles conditional objects", () => {
    expect(cn("px-4", { "py-2": true, "opacity-0": false })).toBe("px-4 py-2")
  })

  test("merges conflicting Tailwind classes (last wins)", () => {
    expect(cn("px-4", "px-2")).toBe("px-2")
  })

  test("merges responsive variants correctly", () => {
    expect(cn("px-4", "md:px-6")).toBe("px-4 md:px-6")
  })

  test("returns empty string for no args", () => {
    expect(cn()).toBe("")
  })
})

describe("raise", () => {
  test("throws error with given message", () => {
    expect(() => raise("something went wrong")).toThrow("something went wrong")
  })
})

describe("formatTime", () => {
  test("formats seconds to M:SS", () => {
    expect(formatTime(0)).toBe("0:00")
    expect(formatTime(5)).toBe("0:05")
    expect(formatTime(65)).toBe("1:05")
    expect(formatTime(3599)).toBe("59:59")
  })

  test("handles undefined", () => {
    expect(formatTime(undefined)).toBe("0:00")
  })

  test("handles NaN", () => {
    expect(formatTime(NaN)).toBe("0:00")
  })

  test("handles Infinity", () => {
    expect(formatTime(Infinity)).toBe("0:00")
  })
})

describe("compareTracksByNumberName", () => {
  const t = (overrides: Partial<Track>): Track => ({
    id: "id",
    name: "z",
    albumId: "alb",
    playtimeSeconds: 100,
    path: "/dev/null",
    ...overrides,
  })

  test("sorts by track number ascending", () => {
    const a = t({ trackNumber: 2, name: "a" })
    const b = t({ trackNumber: 1, name: "b" })
    expect([a, b].sort(compareTracksByNumberName)).toEqual([b, a])
  })

  test("track with number comes before track without", () => {
    const withNum = t({ trackNumber: 1, name: "a" })
    const without = t({ name: "b" })
    expect([without, withNum].sort(compareTracksByNumberName)).toEqual([
      withNum,
      without,
    ])
  })

  test("track without number comes after track with number", () => {
    const withNum = t({ trackNumber: 1, name: "b" })
    const without = t({ name: "a" })
    expect([without, withNum].sort(compareTracksByNumberName)).toEqual([
      withNum,
      without,
    ])
  })

  test("sorts alphabetically when neither has track number", () => {
    const a = t({ name: "delta" })
    const b = t({ name: "alpha" })
    const c = t({ name: "beta" })
    expect([a, b, c].sort(compareTracksByNumberName)).toEqual([b, c, a])
  })

  test("equal track numbers: stable sort preserves input order", () => {
    const a = t({ trackNumber: 1, name: "a" })
    const b = t({ trackNumber: 1, name: "b" })
    // comparator returns 0 → stable sort keeps original order
    expect([a, b].sort(compareTracksByNumberName)).toEqual([a, b])
    expect([b, a].sort(compareTracksByNumberName)).toEqual([b, a])
  })

  test("all undefined trackNumbers sorts by name", () => {
    const items = [t({ name: "z" }), t({ name: "a" }), t({ name: "m" })]
    expect(items.sort(compareTracksByNumberName).map((x) => x.name)).toEqual([
      "a",
      "m",
      "z",
    ])
  })
})
