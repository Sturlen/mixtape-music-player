export type Source = {
  id: string
  name: string // user displayed
  rootPath: string
}

export type Track = {
  id: string
  name: string
  albumId: string
  playtimeSeconds: number
  trackNumber?: number
  path: string
  URL: string
  artURL?: string
  audiAssetId?: string
}

export type Album = {
  id: string
  name: string
  artistId: string
  imagePath?: string
  imageURL?: string
  artAssetId?: string
}

export type Artist = {
  id: string
  name: string
  imagePath?: string
  imageURL?: string
  artAssetId?: string
}

export type AssetBase = {
  id: string
  parentId: string
  path: string
  name: string
  filetype: "audio" | "image"
  fileExt: string
}

export type ArtAsset = AssetBase & {
  filetype: "image"
  width: number
  height: number
  // fileExt: "png" | "webp" | "jpeg" | "avif" | "bmp"
}

export type AudioAsset = AssetBase & {
  filetype: "audio"
  duration: number
  // fileExt: "mp3" | "flac" | "ogg"
}

export type Asset = ArtAsset | AudioAsset
