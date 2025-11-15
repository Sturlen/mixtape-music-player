export function clamp(value: number, min = 0, max = 1): number {
  const low = Math.min(min, max)
  const high = Math.max(min, max)
  return Math.min(Math.max(value, low), high)
}
