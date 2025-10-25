import React, { useEffect, useMemo, useState } from "react"
import {
  Play as PlayIcon,
  Pause as PauseIcon,
  SkipBack as SkipBackIcon,
  SkipForward as SkipForwardIcon,
  X as XIcon,
} from "lucide-react"
import { useAudioPlayer } from "@/Player"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/Components/ui/drawer"
import PlaybackQueue from "@/QueueList"
import { usePlaybackDrawer } from "@/contexts/PlaybackDrawerContext"

const formatTime = (s?: number) => {
  if (!s || !isFinite(s)) return "0:00"
  const min = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${min}:${sec < 10 ? "0" : ""}${sec}`
}

export default function PlaybackDetails() {
  const isPlaying = useAudioPlayer.use.isPlaying()
  const play = useAudioPlayer.use.play()
  const pause = useAudioPlayer.use.pause()
  const currentTrack = useAudioPlayer.use.currentTrack()
  const duration = useAudioPlayer.use.duration()
  const currentTime = useAudioPlayer.use.currentTime()
  const queueSkip = useAudioPlayer.use.queueSkip()
  const queuePrev = useAudioPlayer.use.queuePrev()
  const setCurrentTime = useAudioPlayer.use.setCurrentTime()

  const { open, setOpen } = usePlaybackDrawer()
  const [seeking, setSeeking] = useState<number | null>(null)

  // value displayed in the seek bar (seconds)
  const seekValue = useMemo(
    () => seeking ?? currentTime ?? 0,
    [seeking, currentTime]
  )

  useEffect(() => {
    // close drawer if there is no track
    if (!currentTrack) setOpen(false)
  }, [currentTrack])

  const onSeekStart = () => setSeeking(currentTime ?? 0)
  const onSeekChange = (val: number) => setSeeking(val)
  const onSeekEnd = () => {
    if (seeking != null) setCurrentTime(seeking)
    setSeeking(null)
  }

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <div className="p-4 flex flex-col gap-4">
            <PlaybackQueue />
            <div className="w-full flex gap-4 items-center">
              <div
                className="w-36 h-36 bg-gray-800 bg-center bg-cover shrink-0"
                style={{
                  backgroundImage: currentTrack?.artURL
                    ? `url(${currentTrack.artURL})`
                    : undefined,
                }}
              />
              <div className="flex-1">
                <div className="text-xl font-bold truncate">
                  {currentTrack?.name ?? "No track"}
                </div>
                <div className="text-sm opacity-80">
                  {currentTrack?.url
                    ? new URL(currentTrack.url, location.href).pathname
                        .split("/")
                        .pop()
                    : ""}
                </div>
                <div className="mt-3 text-sm opacity-80">
                  Duration: {formatTime(currentTrack?.duration ?? duration)}
                </div>
              </div>
            </div>

            {/* seek bar */}
            <div className="w-full">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="w-12 text-right">{formatTime(seekValue)}</span>
                <input
                  aria-label="Seek"
                  type="range"
                  min={0}
                  max={duration ?? 0}
                  value={seekValue}
                  onMouseDown={onSeekStart}
                  onTouchStart={onSeekStart}
                  onChange={(e) => onSeekChange(Number(e.target.value))}
                  onMouseUp={onSeekEnd}
                  onTouchEnd={onSeekEnd}
                  className="flex-1"
                />
                <span className="w-12">{formatTime(duration)}</span>
              </div>
            </div>

            {/* playback controls */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <button
                onClick={queuePrev}
                aria-label="Previous"
                className="p-2 rounded-full hover:bg-gray-800 transition"
              >
                <SkipBackIcon size={28} />
              </button>

              <button
                onClick={isPlaying ? pause : play}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 transition"
              >
                {isPlaying ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
              </button>

              <button
                onClick={queueSkip}
                aria-label="Next"
                className="p-2 rounded-full hover:bg-gray-800 transition"
              >
                <SkipForwardIcon size={28} />
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
