//** Why? because crypto is not available on http scheme, other than localhost and thus dosen't work on local network */
export function randomUUIDFallback(): string {
  // Generate 16 random bytes without using the Web Crypto API.
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256)
  }

  // Per RFC 4122, set version to 4 -> xxxx xxxx xxxx 4xxx ....
  // @ts-expect-error
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  // Per RFC 4122, set variant to 10xx -> 8, 9, a, or b
  // @ts-expect-error
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")

  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20, 32)
  )
}
