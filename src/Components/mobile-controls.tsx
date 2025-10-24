import React from "react"
import { Play, Pause, SkipForwardIcon } from "lucide-react"
import { useAudioPlayer } from "@/Player"
import { cn } from "@/lib/utils"

const MobileControls = ({ className }: { className?: string }) => {
  const {
    isPlaying,
    play,
    pause,
    currentTrack,
    duration,
    currentTime,
    queueSkip,
  } = useAudioPlayer()

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 10)
    return `${min}:${sec < 10 ? "0" : ""}${sec}`
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-sidebar text-foreground flex items-center justify-between px-4 py-3 z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.2)] gap-2",
        { hidden: !currentTrack },
        className
      )}
    >
      <button
        className="p-2 rounded-full hover:bg-gray-800 transition"
        style={{
          backgroundImage: currentTrack?.artURL
            ? `url(${currentTrack.artURL})`
            : undefined,
        }}
        onClick={isPlaying ? pause : play}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={32} /> : <Play size={32} />}
      </button>
      <button
        className="p-2 rounded-full hover:bg-gray-800 transition"
        onClick={queueSkip}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {<SkipForwardIcon size={32} />}
      </button>
      <div className="flex-1 w-1">
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
