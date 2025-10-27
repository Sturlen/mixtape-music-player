export type Source = {
  id: string
  name: string // user displayed
  rootPath: string
}

export type Track = {
  id: string
  name: string
  playtimeSeconds: number
  path: string
  URL: string
  artURL?: string
}

export type Album = {
  id: string
  name: string
  tracks: Track[]
  imagePath?: string
  imageURL?: string
}

export type Artist = {
  id: string
  name: string
  albums: Album[]
  imagePath?: string
  imageURL?: string
}
