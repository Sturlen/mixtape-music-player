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
