import { getColor } from "colorthief"

export type DominantColor = {
  hex: string
  textColor: string
}

export async function dominantColor(filePath: string): Promise<DominantColor | null> {
  try {
    const color = await getColor(filePath, { quality: 5 })
    if (!color) return null
    return { hex: color.hex(), textColor: color.textColor }
  } catch {
    return null
  }
}
