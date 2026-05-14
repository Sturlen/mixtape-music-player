"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Search, User, Disc, Music } from "lucide-react"
import { Button } from "@/client/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command"

interface SearchResponse {
  artists: { id: string; name: string }[]
  albums: { id: string; name: string; artistId: string }[]
  tracks: { id: string; name: string; albumId: string }[]
}

export function SearchButton() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResponse | null>(null)
  const navigate = useNavigate()

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

  const handleSearch = async (q: string) => {
    setQuery(q)
    if (q.length < 1) {
      setResults(null)
      return
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
    } catch (err) {
      console.error("search error", err)
    }
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
            <>
              {results.artists.length > 0 && (
                <CommandGroup heading="Artists">
                  {results.artists.map((artist) => (
                    <CommandItem
                      key={artist.id}
                      value={artist.name}
                      onSelect={() => handleSelect("artist", artist.id)}
                    >
                      <User className="mr-2 h-4 w-4" />
                      {artist.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.albums.length > 0 && (
                <CommandGroup heading="Albums">
                  {results.albums.map((album) => (
                    <CommandItem
                      key={album.id}
                      value={album.name}
                      onSelect={() => handleSelect("album", album.id)}
                    >
                      <Disc className="mr-2 h-4 w-4" />
                      {album.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {results.tracks.length > 0 && (
                <CommandGroup heading="Tracks">
                  {results.tracks.map((track) => (
                    <CommandItem
                      key={track.id}
                      value={track.name}
                      onSelect={() => handleSelect("track", track.albumId)}
                    >
                      <Music className="mr-2 h-4 w-4" />
                      {track.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
