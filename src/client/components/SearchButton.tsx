"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Button } from "@/client/components/ui/button"
import { ArtImage } from "@/client/components/ArtImage"
import { useDebouncer } from "@tanstack/react-pacer"
import {
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command"

interface SearchResponse {
  artists: { id: string; name: string; primaryColor: string | null; textColor: string | null; imageURL: string }[]
  albums: { id: string; name: string; artistId: string; artistName: string | null; primaryColor: string | null; textColor: string | null; imageURL: string }[]
  tracks: { id: string; name: string; albumId: string; albumName: string | null; primaryColor: string | null; textColor: string | null; imageURL: string }[]
}

export function SearchButton() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [results, setResults] = useState<SearchResponse | null>(null)
  const navigate = useNavigate()

  const searchDebouncer = useDebouncer(
    useCallback((q: string) => setDebouncedQuery(q), []),
    { wait: 300 },
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    if (debouncedQuery.length < 1) {
      setResults(null)
      return
    }
    let cancelled = false
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setResults(data)
      })
      .catch((err) => console.error("search error", err))
    return () => { cancelled = true }
  }, [debouncedQuery])

  const handleSearch = (q: string) => {
    setQuery(q)
    searchDebouncer.maybeExecute(q)
  }

  const handleSelect = (type: string, id: string) => {
    setOpen(false)
    if (type === "artist") navigate({ to: "/artists/$id", params: { id } })
    else if (type === "album") navigate({ to: "/albums/$id", params: { id } })
    else if (type === "track") {
      navigate({ to: "/albums/$id", params: { id } })
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        className="flex h-[450px] w-full items-start justify-center p-4"
      >
        <CommandInput
          placeholder="Search artists, albums, tracks..."
          value={query}
          onValueChange={handleSearch}
        />
        <CommandList>
          {!results ||
          (results.artists.length === 0 &&
            results.albums.length === 0 &&
            results.tracks.length === 0) ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            [
              ...results.artists.map((artist) => (
                  <CommandItem
                  key={`artist:${artist.id}`}
                  value={`artist:${artist.id}:${artist.name}`}
                  onSelect={() => handleSelect("artist", artist.id)}
                >
                  <ArtImage
                    src={artist.imageURL}
                    name={artist.name}
                    primaryColor={artist.primaryColor}
                    textColor={artist.textColor}
                    className="mr-3 size-14 shrink-0"
                    noFallback
                  />
                  <span>{artist.name}</span>
                </CommandItem>
              )),
              ...results.albums.map((album) => (
                <CommandItem
                  key={`album:${album.id}`}
                  value={`album:${album.id}:${album.name}`}
                  onSelect={() => handleSelect("album", album.id)}
                >
                  <ArtImage
                    src={album.imageURL}
                    name={album.name}
                    primaryColor={album.primaryColor}
                    textColor={album.textColor}
                    className="mr-3 size-14 shrink-0"
                    noFallback
                  />
                  <div className="flex flex-col">
                    <span>{album.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ALBUM<span className="mx-1">·</span>{album.artistName}
                    </span>
                  </div>
                </CommandItem>
              )),
              ...results.tracks.map((track) => (
                <CommandItem
                  key={`track:${track.id}`}
                  value={`track:${track.id}:${track.name}`}
                  onSelect={() => handleSelect("track", track.albumId)}
                >
                  <ArtImage
                    src={track.imageURL}
                    name={track.name}
                    primaryColor={track.primaryColor}
                    textColor={track.textColor}
                    className="mr-3 size-14 shrink-0"
                    noFallback
                  />
                  <div className="flex flex-col">
                    <span>{track.name}</span>
                    <span className="text-muted-foreground text-xs">
                      TRACK<span className="mx-1">·</span>{track.albumName}
                    </span>
                  </div>
                </CommandItem>
              )),
            ]
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
