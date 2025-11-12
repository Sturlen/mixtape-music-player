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
          <div className="flex flex-col gap-4 p-4">
            <PlaybackQueue />
            <div className="flex w-full items-center gap-4">
              <div
                className="h-36 w-36 shrink-0 bg-gray-800 bg-cover bg-center"
                style={{
                  backgroundImage: currentTrack?.artURL
                    ? `url(${currentTrack.artURL})`
                    : undefined,
                }}
              />
              <div className="flex-1">
                <div className="line-clamp-2 text-xl font-bold">
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
                className="rounded-full p-2 transition hover:bg-gray-800"
              >
                <SkipBackIcon size={28} />
              </button>

              <button
                onClick={isPlaying ? pause : play}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="rounded-full bg-white/5 p-3 transition hover:bg-white/10"
              >
                {isPlaying ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
              </button>

              <button
                onClick={queueSkip}
                aria-label="Next"
                className="rounded-full p-2 transition hover:bg-gray-800"
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
