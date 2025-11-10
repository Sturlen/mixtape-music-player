import React, { useEffect } from "react"
import {
  Play as PlayIcon,
  Pause as PauseIcon,
  SkipBack as SkipBackIcon,
  SkipForward as SkipForwardIcon,
  X as XIcon,
} from "lucide-react"
import { useAudioPlayer, useCurrentTrack } from "@/Player"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/Components/ui/drawer"
import PlaybackQueue from "@/QueueList"
import SeekBar from "@/Components/SeekBar"
import { usePlaybackDrawer } from "@/contexts/PlaybackDrawerContext"
import VolumeSlider from "@/VolumeControl"
import { Cassette } from "@/Components/Cassette"

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
  const currentTrack = useCurrentTrack()
  const album_name = currentTrack?.album?.name
  const duration = useAudioPlayer.use.duration()
  const queueSkip = useAudioPlayer.use.queueSkip()
  const queuePrev = useAudioPlayer.use.queuePrev()

  const { open, setOpen } = usePlaybackDrawer()

  useEffect(() => {
    // close drawer if there is no track
    if (!currentTrack) setOpen(false)
  }, [currentTrack])

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
                <div className="text-xl font-bold line-clamp-2">
                  {currentTrack?.name ?? "No track"}
                </div>
                <div className="text-sm opacity-80">{album_name}</div>
                <div className="mt-3 text-sm opacity-80">
                  Duration: {formatTime(duration)}
                </div>
              </div>
              {/* vertical volume slider */}
              <VolumeSlider />
            </div>

            {/* seek bar */}
            <SeekBar />

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
