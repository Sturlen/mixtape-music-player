import sharp from "sharp"

export interface ImageOptions {
  width?: number
  height?: number
  quality?: number
  format?: "jpeg" | "png" | "webp" | "avif"
}

/**
 * Process an image file with the given options
 * @param filePath Path to the image file
 * @param options Image processing options
 * @returns Buffer containing the processed image
 */
export async function processImage(
  filePath: string,
  options: ImageOptions = {},
): Promise<Buffer> {
  const { width, height, quality = 80, format = "webp" } = options

  try {
    let transform = sharp(filePath)

    // Resize if dimensions are provided
    if (width || height) {
      transform = transform.resize(width, height, {
        fit: "cover",
        position: "center",
      })
    }

    // Apply format-specific quality settings
    switch (format) {
      case "jpeg":
        transform = transform.jpeg({ quality, progressive: true })
        break
      case "png":
        transform = transform.png({ quality })
        break
      case "webp":
        transform = transform.webp({ quality })
        break
      case "avif":
        transform = transform.avif({ quality })
        break
    }

    return await transform.toBuffer()
  } catch (err) {
    console.error(`Error processing image ${filePath}:`, err)
    throw err
  }
}

/**
 * Get the MIME type for a format
 */
export function getMimeType(format: string): string {
  const mimeTypes: Record<string, string> = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  }
  return mimeTypes[format] || "image/webp"
}
