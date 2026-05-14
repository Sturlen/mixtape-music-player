import sharp from "sharp"
import { getColor } from "colorthief"

export type ArtInfo = {
  hex: string
  textColor: string
  width: number
  height: number
}

export async function artInfo(filePath: string): Promise<ArtInfo | null> {
  try {
    const [color, meta] = await Promise.all([
      getColor(filePath, { quality: 5 }),
      sharp(filePath).metadata(),
    ])
    if (!color) return null
    return {
      hex: color.hex(),
      textColor: color.textColor,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    }
  } catch {
    return null
  }
}
