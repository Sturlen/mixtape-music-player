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

interface SearchResultItem {
  type: "artist" | "album" | "track"
  id: string
  name: string
  artistId?: string
  albumId?: string
  artistName: string | null
  albumName: string | null
  year: number | null
  primaryColor: string | null
  textColor: string | null
  imageURL: string
  related: boolean
}

interface SearchResponse {
  results: SearchResultItem[]
  related: SearchResultItem[]
}

function SearchItem({
  item,
  onSelect,
}: {
  item: SearchResultItem
  onSelect: (type: string, id: string, albumId?: string, trackId?: string) => void
}) {
  const subtitle = () => {
    if (item.type === "artist") return "ARTIST"
    if (item.type === "album") {
      const parts = ["ALBUM", item.year, item.artistName].filter(Boolean)
      return parts.join(" · ")
    }
    const parts = ["TRACK", item.albumName].filter(Boolean)
    return parts.join(" · ")
  }

  return (
    <CommandItem
      value={`${item.type}:${item.id}:${item.name}`}
      onSelect={() => {
        if (item.type === "track") onSelect("track", item.id, item.albumId, item.id)
        else onSelect(item.type, item.id)
      }}
      className={item.related ? "opacity-60" : undefined}
    >
      <ArtImage
        src={item.imageURL}
        name={item.name}
        primaryColor={item.primaryColor}
        textColor={item.textColor}
        className="mr-3 size-9 shrink-0"
        noFallback
      />
      <div className="flex flex-col">
        <span>{item.name}</span>
        <span className="text-muted-foreground text-xs">{subtitle()}</span>
      </div>
    </CommandItem>
  )
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
    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const handleSearch = (q: string) => {
    setQuery(q)
    searchDebouncer.maybeExecute(q)
  }

  const handleSelect = (type: string, id: string, albumId?: string, trackId?: string) => {
    setOpen(false)
    if (type === "artist") navigate({ to: "/artists/$id", params: { id } })
    else if (type === "album") navigate({ to: "/albums/$id", params: { id } })
    else if (type === "track") {
      navigate({
        to: "/albums/$id",
        params: { id: albumId ?? id },
        hash: `track-${trackId ?? id}`,
      })
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
          {!results || (results.results.length === 0 && results.related.length === 0) ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            [
              ...results.results.map((item) => (
                <SearchItem key={`${item.type}:${item.id}`} item={item} onSelect={handleSelect} />
              )),
              ...results.related.length > 0
                ? [
                    <div
                      key="related-divider"
                      className="text-muted-foreground px-2 pt-2 pb-1 text-xs font-medium"
                    >
                      Related
                    </div>,
                    ...results.related.map((item) => (
                      <SearchItem
                        key={`related:${item.type}:${item.id}`}
                        item={item}
                        onSelect={handleSelect}
                      />
                    )),
                  ]
                : [],
            ]
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
