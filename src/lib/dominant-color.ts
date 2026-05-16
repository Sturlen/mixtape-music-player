import sharp from "sharp"
import { getPalette } from "colorthief"

export type ArtInfo = {
  hex: string
  textColor: string
  supportingColor: string
  width: number
  height: number
}

export async function artInfo(filePath: string): Promise<ArtInfo | null> {
  try {
    const [palette, meta] = await Promise.all([
      getPalette(filePath, { colorCount: 4, quality: 5 }),
      sharp(filePath).metadata(),
    ])
    if (!palette || palette.length === 0) return null
    const primary = palette[0]
    if (!primary) return null
    const supporting = palette[1] ?? primary
    return {
      hex: primary.hex(),
      textColor: primary.textColor,
      supportingColor: supporting.hex(),
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    }
  } catch {
    return null
  }
}
