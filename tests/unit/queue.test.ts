import { describe, test, expect } from "bun:test"
import { advance, prev, remove, shuffleArray } from "@/lib/queue"

describe("advance", () => {
  test("returns next index", () => {
    expect(advance(0, 5)).toBe(1)
    expect(advance(1, 5)).toBe(2)
    expect(advance(3, 5)).toBe(4)
  })

  test("returns undefined at last index", () => {
    expect(advance(4, 5)).toBeUndefined()
  })

  test("returns undefined for empty queue", () => {
    expect(advance(0, 0)).toBeUndefined()
  })

  test("returns undefined for single item", () => {
    expect(advance(0, 1)).toBeUndefined()
  })
})

describe("prev", () => {
  test("returns previous index", () => {
    expect(prev(2)).toBe(1)
    expect(prev(3)).toBe(2)
    expect(prev(1)).toBe(0)
  })

  test("returns undefined at first index", () => {
    expect(prev(0)).toBeUndefined()
  })
})

describe("remove", () => {
  test("removes item before current index", () => {
    const items = ["a", "b", "c"]
    const result = remove(items, 0, 1)
    expect(result).toEqual({ items: ["b", "c"], currentIndex: 0 })
  })

  test("removes item at current index (not last)", () => {
    const items = ["a", "b", "c"]
    const result = remove(items, 1, 1)
    expect(result).toEqual({ items: ["a", "c"], currentIndex: 1 })
  })

  test("removes item at current index (last)", () => {
    const items = ["a", "b"]
    const result = remove(items, 1, 1)
    expect(result).toEqual({ items: ["a"], currentIndex: 0 })
  })

  test("removes item after current index", () => {
    const items = ["a", "b", "c"]
    const result = remove(items, 2, 0)
    expect(result).toEqual({ items: ["a", "b"], currentIndex: 0 })
  })

  test("returns undefined for invalid delete index", () => {
    const items = ["a", "b"]
    expect(remove(items, 5, 0)).toBeUndefined()
    expect(remove(items, -1, 0)).toBeUndefined()
  })

  test("returns empty items when removing last element", () => {
    const items = ["a"]
    const result = remove(items, 0, 0)
    expect(result).toEqual({ items: [], currentIndex: 0 })
  })

  test("does not mutate original array", () => {
    const items = ["a", "b", "c"]
    remove(items, 0, 1)
    expect(items).toEqual(["a", "b", "c"])
  })
})

describe("shuffleArray", () => {
  test("returns array with same elements", () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffleArray(input)
    expect(result.sort()).toEqual([1, 2, 3, 4, 5])
  })

  test("does not mutate original array", () => {
    const input = [1, 2, 3]
    shuffleArray(input)
    expect(input).toEqual([1, 2, 3])
  })

  test("handles empty array", () => {
    expect(shuffleArray([])).toEqual([])
  })

  test("handles single element", () => {
    expect(shuffleArray([42])).toEqual([42])
  })

  test("preserves all elements", () => {
    const input = ["a", "b", "c", "d"]
    const result = shuffleArray(input)
    expect(result).toHaveLength(4)
    expect(result).toContain("a")
    expect(result).toContain("b")
    expect(result).toContain("c")
    expect(result).toContain("d")
  })
})
