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
        "fixed bottom-0 left-0 right-0 bg-sidebar text-foreground flex items-center justify-between pr-4 z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.2)] gap-4 touch-none",
        { hidden: !currentTrack },
        className
      )}
    >
      <div className="flex items-center gap-2">
        <button
          className="p-2 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            isPlaying ? pause() : play()
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <div
            className="p-3 rounded-full hover:bg-gray-800 transition flex items-center justify-center"
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
      <div className="flex-1 w-1 py-3">
        <div className="font-bold block truncate line-clamp-1">
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
