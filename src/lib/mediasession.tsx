import { useCallback, useEffect, useMemo, useRef } from "react"

type ArtworkItem = {
  src: string
  sizes?: string // e.g., "96x96" or "512x512"
  type?: string // e.g., "image/png", "image/jpeg"
}

type MediaMetadataInput = {
  title?: string
  artist?: string
  album?: string
  artwork?: ArtworkItem[]
}

type ActionHandlerMap = Partial<{
  play: () => void | Promise<void>
  pause: () => void | Promise<void>
  previoustrack: () => void | Promise<void>
  nexttrack: () => void | Promise<void>
  seekbackward: (details?: MediaSessionActionDetails) => void | Promise<void>
  seekforward: (details?: MediaSessionActionDetails) => void | Promise<void>
  seekto: (
    details: MediaSessionActionDetails & { seekTime?: number }
  ) => void | Promise<void>
  stop: () => void | Promise<void>
  skipad: () => void | Promise<void>
}>

type UseMediaSessionOptions = {
  // Keep playbackState in sync with your player
  playbackState?: "none" | "paused" | "playing"
  // Initial metadata
  metadata?: MediaMetadataInput
  // Register media key handlers
  handlers?: ActionHandlerMap
}

export function useMediaSession(options?: UseMediaSessionOptions) {
  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaSession &&
    !!window.MediaMetadata

  const handlersRef = useRef<ActionHandlerMap | undefined>(options?.handlers)
  handlersRef.current = options?.handlers

  // Set metadata
  const setMetadata = useCallback(
    (meta: MediaMetadataInput) => {
      if (!supported || !navigator.mediaSession || !window.MediaMetadata) return
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        artwork: meta.artwork,
      })
    },
    [supported]
  )

  // Update only artwork (convenience)
  const setArtwork = useCallback(
    (artwork: ArtworkItem[]) => {
      if (!supported || !navigator.mediaSession || !window.MediaMetadata) return
      const current = navigator.mediaSession.metadata || ({} as MediaMetadata)
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: current.album,
        artwork,
      })
    },
    [supported]
  )

  // Update playback state
  const setPlaybackState = useCallback(
    (state: "none" | "paused" | "playing") => {
      if (!supported || !navigator.mediaSession) return
      navigator.mediaSession.playbackState = state
    },
    [supported]
  )

  // Register action handlers with cleanup
  const setHandlers = useCallback(
    (map: ActionHandlerMap | undefined) => {
      if (!supported || !navigator.mediaSession) return

      const actions: MediaSessionAction[] = [
        "play",
        "pause",
        "previoustrack",
        "nexttrack",
        "seekbackward",
        "seekforward",
        "seekto",
        "stop",
        "skipad",
      ]

      // Clear all first, then set provided
      actions.forEach((a) => navigator.mediaSession!.setActionHandler(a, null))
      if (!map) return
      ;(Object.keys(map) as (keyof ActionHandlerMap)[]).forEach((k) => {
        const handler = map[k]
        if (handler) {
          navigator.mediaSession!.setActionHandler(
            k as MediaSessionAction,
            (details?: MediaSessionActionDetails) => {
              // Ensure async exceptions don’t leak
              Promise.resolve(handler(details as never)).catch(() => void 0)
            }
          )
        }
      })
    },
    [supported]
  )

  // Initialize from options and keep in sync
  useEffect(() => {
    if (!supported) return

    if (options?.metadata) {
      setMetadata(options.metadata)
    }
    if (options?.playbackState) {
      setPlaybackState(options.playbackState)
    }
    setHandlers(options?.handlers)

    return () => {
      // Cleanup: clear handlers and metadata on unmount
      if (!navigator.mediaSession) return
      setHandlers(undefined)
      navigator.mediaSession.metadata = null
      if (typeof navigator.mediaSession.playbackState !== "undefined") {
        navigator.mediaSession.playbackState = "none"
      }
    }
  }, [supported]) // run once when support is known

  // Keep handlers reactive if options.handlers changes
  useEffect(() => {
    if (!supported) return
    setHandlers(handlersRef.current)
  }, [supported, setHandlers, options?.handlers])

  // React to external changes
  useEffect(() => {
    if (!supported) return
    if (options?.metadata) setMetadata(options.metadata)
  }, [supported, setMetadata, options?.metadata])

  useEffect(() => {
    if (!supported) return
    if (options?.playbackState) setPlaybackState(options.playbackState)
  }, [supported, setPlaybackState, options?.playbackState])

  return useMemo(
    () => ({
      supported,
      setMetadata,
      setArtwork,
      setPlaybackState,
      setHandlers,
    }),
    [supported, setMetadata, setArtwork, setPlaybackState, setHandlers]
  )
}
