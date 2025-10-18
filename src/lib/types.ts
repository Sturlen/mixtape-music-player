export type DBTrack = {
  id: string
  name: string
  playtimeSeconds: number
  path: string
  URL: string
}

export type DBAlbum = {
  id: string
  name: string
  tracks: DBTrack[]
  imagePath?: string
  imageURL?: string
}

export type DBArtist = {
  id: string
  name: string
  albums: DBAlbum[]
}
