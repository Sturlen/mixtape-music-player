import React, { useEffect, useState } from "react"
import {
  Play as PlayIcon,
  Pause as PauseIcon,
  SkipBack as SkipBackIcon,
  SkipForward as SkipForwardIcon,
  X as XIcon,
  ShuffleIcon,
} from "lucide-react"
import { useAudioPlayer, useCurrentTrack, useIsPlaying } from "@/Player"
import { cn, formatTime } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/client/components/ui/drawer"
import PlaybackQueue from "@/QueueList"
import SeekBar from "@/client/components/SeekBar"
import { usePlaybackDrawer } from "@/contexts/PlaybackDrawerContext"
import VolumeSlider from "@/VolumeControl"
import { Cassette } from "@/client/components/Cassette"
import { useListenTogetherStore } from "@/listen-together/store"

function ShuffleButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const isShuffled = useAudioPlayer.use.isShuffled()
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Shuffle"
      className={cn(
        "rounded-full p-2",
        disabled ? "pointer-events-none opacity-40" : "text-primary/60 hover:bg-gray-800",
      )}
    >
      <ShuffleIcon
        size={28}
        className={
          isShuffled ? "-scale-y-100 transition-transform" : "transition-transform"
        }
      />
    </button>
  )
}

export default function PlaybackDetails() {
  const isPlaying = useIsPlaying()
  const play = useAudioPlayer.use.play()
  const pause = useAudioPlayer.use.pause()
  const currentTrack = useCurrentTrack()
  const album_name = currentTrack?.album?.name
  const duration = useAudioPlayer.use.duration()
  const queueSkip = useAudioPlayer.use.queueSkip()
  const queuePrev = useAudioPlayer.use.queuePrev()
  const shuffle = useAudioPlayer.use.queueShuffle()

  const { open, setOpen } = usePlaybackDrawer()

  const inSession = !!useListenTogetherStore((s) => s.roomId)
  const isHost = useListenTogetherStore((s) => s.isHost)
  const skipPrevDisabled = inSession && isHost === false

  const handlePlayPause = () => {
    if (isPlaying) pause()
    else play()
  }

  useEffect(() => {
    if (!currentTrack) setOpen(false)
  }, [currentTrack])

  return (
    <>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="p flex h-[900px] pb-10">
          <PlaybackQueue className="mt-3 min-h-0 flex-1 overflow-y-auto" />
          <div className="flex-col gap-4 p-4">
            <div className="flex w-full shrink-0 items-center gap-4">
              <div
                className="aspect-square h-36 w-36 shrink-0 bg-gray-800 bg-cover bg-center"
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
              <button className="invisible rounded-full p-2 transition hover:bg-gray-800">
                <SkipForwardIcon size={28} />
              </button>
              <button
                onClick={queuePrev}
                disabled={skipPrevDisabled}
                aria-label="Previous"
                className={cn(
                  "rounded-full p-2 transition",
                  skipPrevDisabled ? "pointer-events-none opacity-40" : "hover:bg-gray-800",
                )}
              >
                <SkipBackIcon size={28} />
              </button>

              <button
                onClick={handlePlayPause}
                aria-label={isPlaying ? "Pause" : "Play"}
                className={cn(
                  "rounded-full p-3 transition",
                  "bg-white/5 hover:bg-white/10",
                )}
              >
                {isPlaying ? <PauseIcon size={28} /> : <PlayIcon size={28} />}
              </button>

              <button
                onClick={queueSkip}
                disabled={skipPrevDisabled}
                aria-label="Next"
                className={cn(
                  "rounded-full p-2 transition",
                  skipPrevDisabled ? "pointer-events-none opacity-40" : "hover:bg-gray-800",
                )}
              >
                <SkipForwardIcon size={28} />
              </button>
              <ShuffleButton onClick={shuffle} disabled={skipPrevDisabled} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
