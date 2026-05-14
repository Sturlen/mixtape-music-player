/**
 * File size or storage capacity. Comes with pretty formatter
 */
class DataSize {
  constructor(private readonly bytes: number) {}

  static fromBytes(bytes: number): DataSize {
    return new DataSize(bytes)
  }

  static fromGB(gb: number): DataSize {
    return new DataSize(gb * 1024 ** 3)
  }

  format(unit: "B" | "KB" | "MB" | "GB" = "GB"): string {
    switch (unit) {
      case "B":
        return `${this.bytes} B`
      case "KB":
        return `${(this.bytes / 1024).toFixed(2)} KB`
      case "MB":
        return `${(this.bytes / 1024 ** 2).toFixed(2)} MB`
      case "GB":
        return `${(this.bytes / 1024 ** 3).toFixed(2)} GB`
    }
  }

  toString(): string {
    return this.format()
  }
}

export { DataSize }

class Duration {
  constructor(private readonly seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new Error(`Invalid duration in seconds: ${seconds}`)
    }
  }

  static fromSeconds(seconds: number): Duration {
    return new Duration(seconds)
  }

  format(): string {
    const minutes = Math.floor(this.seconds / 60)
    const remainingSeconds = Math.floor(this.seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  toString(): string {
    return this.format()
  }

  toJSON(): number {
    return this.seconds
  }
}

export { Duration }
