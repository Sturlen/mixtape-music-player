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

export type Asset = {
  id: string
  parentId: string
  path: string
  name: string
  filetype: "audio" | "image"
}

export type ArtAsset = Asset & {
  width: number
  height: number
}

export type AudioAsset = Asset & {
  duration: number
}
