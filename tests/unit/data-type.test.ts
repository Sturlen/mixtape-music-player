import { describe, test, expect } from "bun:test"
import { Duration, DataSize } from "@/lib/data_type"

describe("Duration", () => {
  test("formats seconds to M:SS", () => {
    expect(Duration.fromSeconds(0).format()).toBe("0:00")
    expect(Duration.fromSeconds(5).format()).toBe("0:05")
    expect(Duration.fromSeconds(65).format()).toBe("1:05")
    expect(Duration.fromSeconds(3599).format()).toBe("59:59")
  })
  test("formats seconds to HH:MM:SS", () => {
    expect(Duration.fromSeconds(3661).format()).toBe("1:01:01")
    expect(Duration.fromSeconds(36000).format()).toBe("10:00:00")
  })

  test("toString delegates to format", () => {
    expect(Duration.fromSeconds(90).toString()).toBe("1:30")
  })

  test("toJSON returns raw seconds", () => {
    expect(Duration.fromSeconds(125).toJSON()).toBe(125)
  })

  test("throws on NaN", () => {
    expect(() => Duration.fromSeconds(NaN)).toThrow("Invalid duration")
  })

  test("throws on Infinity", () => {
    expect(() => Duration.fromSeconds(Infinity)).toThrow("Invalid duration")
  })

  test("throws on negative", () => {
    expect(() => Duration.fromSeconds(-5)).toThrow("Invalid duration")
  })
})

describe("DataSize", () => {
  test("fromBytes creates instance", () => {
    const d = DataSize.fromBytes(1024 ** 3)
    expect(d).toBeInstanceOf(DataSize)
  })

  test("fromGB creates instance", () => {
    const d = DataSize.fromGB(1)
    expect(d).toBeInstanceOf(DataSize)
  })

  test("formats as GB by default", () => {
    expect(DataSize.fromBytes(2 * 1024 ** 3).format()).toBe("2.00 GB")
  })

  test("formats as MB", () => {
    expect(DataSize.fromBytes(500 * 1024 ** 2).format("MB")).toBe("500.00 MB")
  })

  test("formats as KB", () => {
    expect(DataSize.fromBytes(1500).format("KB")).toBe("1.46 KB")
  })

  test("formats as B", () => {
    expect(DataSize.fromBytes(512).format("B")).toBe("512 B")
  })

  test("fromGB converts correctly", () => {
    expect(DataSize.fromGB(2.5).format()).toBe("2.50 GB")
  })

  test("toString delegates to format", () => {
    expect(DataSize.fromBytes(1024 ** 3).toString()).toBe("1.00 GB")
  })

  test("handles zero bytes", () => {
    expect(DataSize.fromBytes(0).format()).toBe("0.00 GB")
    expect(DataSize.fromBytes(0).format("B")).toBe("0 B")
  })
})
