import { useAudioPlayer } from "@/Player"
import { formatTime } from "@/lib/utils"
import { AddToPlaylistButton } from "@/client/components/AddToPlaylistButton"
import type { ReactNode } from "react"

interface TrackData {
  id: string
  name: string
  playtimeSeconds: number
  trackNumber?: number
  artURL?: string
  primaryColor?: string
  textColor?: string
}

export function TrackRow({
  track,
  onPlay,
  actions,
  index,
  id,
}: {
  track: TrackData
  onPlay: () => void
  actions?: ReactNode
  index: number
  id?: string
}) {
  const queuePush = useAudioPlayer.use.queuePush()
  const play = useAudioPlayer((s) => s.play)

  return (
    <li
      className="group flex cursor-pointer items-center py-2 hover:bg-accent/30 scroll-mt-30"
      onClick={onPlay}
      tabIndex={-1}
      id={id}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onPlay()
        }}
        className="w-8 shrink-0 text-right font-mono text-sm opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current"
      >
        <span className="group-hover:hidden group-focus-within:hidden">
          {track.trackNumber?.toString().padStart(3, "0") || String(index + 1).padStart(3, "0")}
        </span>
        <span className="hidden group-hover:inline group-focus-within:inline font-bold">
          {">>>"}
        </span>
      </button>
      <span className="flex-1 truncate font-mono text-sm font-medium uppercase pointer-events-none">
        {track.name}
      </span>
      <div className="flex shrink-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {actions}
        <AddToPlaylistButton
          trackId={track.id}
          trackName={track.name}
          label="Mix"
          hideIcon
          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity font-mono text-sm font-medium uppercase tracking-wider hover:underline"
        />
        <button
          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity font-mono text-sm font-medium uppercase tracking-wider hover:underline"
          onClick={() => {
            queuePush({
              id: track.id,
              name: track.name,
              duration: track.playtimeSeconds,
              artURL: track.artURL ?? undefined,
              primaryColor: track.primaryColor ?? undefined,
              textColor: track.textColor ?? undefined,
            })
            play()
          }}
        >
          Queue
        </button>
      </div>
      <span className="ml-3 w-14 shrink-0 text-right font-mono text-sm opacity-50">
        {track.playtimeSeconds ? formatTime(track.playtimeSeconds) : "--:--"}
      </span>
    </li>
  )
}
