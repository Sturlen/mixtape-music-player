export type Library = {
  id: string
  name: string
  rootPath: string
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export type Track = {
  id: string
  name: string
  albumId: string
  sourceId?: string
  playtimeSeconds: number
  trackNumber?: number
  path: string
  artURL?: string
  albumName?: string
  artistName?: string
}

export type Album = {
  id: string
  name: string
  artistId: string
  year?: number
  imageURL?: string
  primaryColor?: string
  textColor?: string
  supportingColor?: string
  artistName?: string
}

export type Artist = {
  id: string
  name: string
  imageURL?: string
  primaryColor?: string
  textColor?: string
  supportingColor?: string
}

export type ArtAssetRole = "cover" | "portrait" | "back" | "other"

export interface Playlist {
  name: string
  id: string
  tracks: Array<{ id: string; name: string }>
  imageUrl?: string
}

export type AssetBase = {
  id: string
  parentId: string
  path: string
  name: string
  filetype: "audio" | "image"
  fileExt: string
}

export type ArtAsset = {
  id: string
  entityId: string
  entityType: "album" | "artist"
  role: ArtAssetRole
  path: string
  mimeType?: string
  width: number
  height: number
  primaryColor?: string
  textColor?: string
  supportingColor?: string
  fileExt: string
}

export type AudioAsset = AssetBase & {
  filetype: "audio"
  duration: number | null
}
