import React from "react"
import { Play, Pause, SkipForwardIcon } from "lucide-react"
import { useAudioPlayer, useCurrentTrack } from "@/Player"
import { cn } from "@/lib/utils"
import { useSwipeable } from "react-swipeable"
import { usePlaybackDrawer } from "@/contexts/PlaybackDrawerContext"

const MobileControls = ({ className }: { className?: string }) => {
  const {
    isPlaying,
    play,
    pause,
    duration,
    currentTime,
    queueSkip,
    queuePrev,
  } = useAudioPlayer()
  const currentTrack = useCurrentTrack()
  const { openDrawer } = usePlaybackDrawer()
  const openPlaybackDetails = () => openDrawer()

  const handlers = useSwipeable({
    onSwipedLeft: queueSkip,
    onSwipedRight: queuePrev,
    onSwipedUp: openPlaybackDetails,
    trackMouse: true, // Enable mouse swipes for testing
  })

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 10)
    return `${min}:${sec < 10 ? "0" : ""}${sec}`
  }
  // TODO: make height a variable
  return (
    <div
      {...handlers}
      onClick={openPlaybackDetails}
      className={cn(
        "bg-sidebar text-foreground fixed right-0 bottom-0 left-0 z-50 flex touch-none items-center justify-between gap-4 pr-4 shadow-[0_-2px_8px_rgba(0,0,0,0.2)]",
        { hidden: !currentTrack },
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <button
          className="flex items-center justify-center p-2"
          onClick={(e) => {
            e.stopPropagation()
            if (isPlaying) {
              pause()
            } else {
              play()
            }
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <div
            className="flex items-center justify-center rounded-full p-3 transition hover:bg-gray-800"
            style={{
              backgroundImage: currentTrack?.artURL
                ? `url(${currentTrack.artURL})`
                : undefined,
            }}
          >
            {isPlaying ? <Pause size={32} /> : <Play size={32} />}
          </div>
        </button>
      </div>
      <div className="w-1 flex-1 py-3">
        <div className="line-clamp-1 block truncate font-bold">
          {currentTrack?.name || "No track"}
        </div>
        <div className="text-sm opacity-80">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  )
}

export default MobileControls
