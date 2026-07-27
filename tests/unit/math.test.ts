import { describe, test, expect } from "bun:test"
import { clamp } from "@/lib/math"

describe("clamp", () => {
  test("clamps value within range", () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })

  test("handles reversed min/max by sorting", () => {
    expect(clamp(5, 10, 0)).toBe(5)
    expect(clamp(-1, 10, 0)).toBe(0)
    expect(clamp(11, 10, 0)).toBe(10)
  })

  test("defaults to 0-1 range", () => {
    expect(clamp(0.5)).toBe(0.5)
    expect(clamp(-1)).toBe(0)
    expect(clamp(2)).toBe(1)
  })

  test("at boundaries", () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  test("handles negative ranges", () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(-15, -10, -1)).toBe(-10)
    expect(clamp(0, -10, -1)).toBe(-1)
  })

  test("handles zero-width range", () => {
    expect(clamp(5, 3, 3)).toBe(3)
    expect(clamp(1, 3, 3)).toBe(3)
    expect(clamp(5, 5, 5)).toBe(5)
  })
})
