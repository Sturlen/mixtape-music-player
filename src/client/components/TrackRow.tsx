import { useAudioPlayer } from "@/Player"
import { cn, formatTime } from "@/lib/utils"
import { AddToPlaylistButton } from "@/client/components/AddToPlaylistButton"
import type { ReactNode } from "react"

function TrackNumber({ value }: { value: number }) {
  const str = String(value).padStart(3, "0")
  const zeros = str.match(/^0+/)?.[0] || ""
  const rest = str.slice(zeros.length)
  return (
    <>
      {zeros && <span className="opacity-40">{zeros}</span>}
      <span className="opacity-80">{rest || "0"}</span>
    </>
  )
}

function TrackArrow({ animate }: { animate: boolean }) {
  if (!animate) return <span className="font-bold">{">>>"}</span>

  return (
    <span className="font-bold">
      <span style={{ animation: "track-arrow 1.8s steps(1) infinite" }}>
        {">"}
      </span>
      <span style={{ animation: "track-arrow-2 1.8s steps(1) infinite" }}>
        {">"}
      </span>
      <span style={{ animation: "track-arrow-3 1.8s steps(1) infinite" }}>
        {">"}
      </span>
    </span>
  )
}

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
  isActive,
  currentTime,
  isPlaying,
}: {
  track: TrackData
  onPlay: () => void
  actions?: ReactNode
  index: number
  id?: string
  isActive?: boolean
  currentTime?: number
  isPlaying?: boolean
}) {
  const queuePush = useAudioPlayer.use.queuePush()
  const play = useAudioPlayer((s) => s.play)

  return (
    <li
      className="group hover:bg-accent/30 mx-4 flex cursor-pointer scroll-mt-30 items-center py-1 md:pr-10"
      onClick={onPlay}
      tabIndex={-1}
      id={id}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onPlay()
        }}
        className={cn(
          "w-8 shrink-0 text-right font-mono text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-inset",
          isActive ? "text-foreground" : "opacity-60",
        )}
      >
        {isActive ? (
          <TrackArrow animate={isPlaying ?? false} />
        ) : (
          <>
            <span className="group-focus-within:hidden group-hover:hidden">
              <TrackNumber value={track.trackNumber ?? index + 1} />
            </span>
            <span className="hidden font-bold group-focus-within:inline group-hover:inline">
              <TrackArrow animate={false} />
            </span>
          </>
        )}
      </button>
      <span
        className={cn(
          "pointer-events-none ml-2 flex-1 truncate font-mono text-lg font-medium uppercase",
          isActive ? "text-foreground" : "text-foreground/80",
        )}
      >
        {track.name}
      </span>
      <div
        className="flex shrink-0 items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {actions}
        <AddToPlaylistButton
          trackId={track.id}
          trackName={track.name}
          label="Mix"
          hideIcon
          className="font-mono text-lg font-medium tracking-wider uppercase opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:underline"
        />
        <button
          className="font-mono text-lg font-medium tracking-wider uppercase opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:underline"
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
      <span
        className={cn(
          "ml-3 w-14 shrink-0 text-right font-mono text-lg",
          isActive ? "text-foreground" : "text-foreground/60",
        )}
      >
        {isActive
          ? `-${formatTime(Math.max(0, track.playtimeSeconds - (currentTime ?? 0)))}`
          : track.playtimeSeconds
            ? formatTime(track.playtimeSeconds)
            : "--:--"}
      </span>
    </li>
  )
}
