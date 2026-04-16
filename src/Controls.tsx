import {
  CrosshairIcon,
  PauseIcon,
  PlayIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "lucide-react"
import { useAudioPlayer, useCurrentTrack } from "@/Player"
import { cn } from "@/lib/utils"
import VolumeSlider from "@/VolumeControl"
import { Cassette } from "@/client/components/Cassette"
import { CurrentTrackScroller } from "@/client/components/CurrentTrackScroller"
import SeekBar from "@/client/components/SeekBar"
import { useState } from "react"
import { set } from "zod"

export function Controls() {
  const play = useAudioPlayer.use.play()
  const pause = useAudioPlayer.use.pause()
  const requestedPlaybackState = useAudioPlayer.use.requestedPlaybackState()
  const togglePlayback = requestedPlaybackState === "playing" ? pause : play
  const skip = useAudioPlayer.use.queueSkip()
  const prev = useAudioPlayer.use.queuePrev()
  const shuffle = useAudioPlayer.use.queueShuffle()

  const is_play_button_down = requestedPlaybackState === "playing"

  const [flipped, setFlipped] = useState(false)
  const flip = () => setFlipped((f) => !f)

  return (
    <div className="flex w-full flex-col items-center">
      <div className="w-70 rounded-md bg-gray-400 pb-10">
        <Cassette />
      </div>
      <div className="h-4"></div>
      <SeekBar classNameTrack="bg-background" />
      <CurrentTrackScroller />
      <div>VOLUME CONTROLS</div>
      <VolumeSlider
        className="mt-4 mb-4 w-full"
        direction="horizontal"
        classNameTrack="bg-background"
      />
      <div className="w-full">
        <div className="grow"></div>

        <div className="flex h-6 items-center justify-center">
          <div className="px-2 backdrop-blur-sm">
            <CurrentTime />
            <Duration />
          </div>
        </div>
        <div className="flex h-20 justify-stretch gap-2 pt-4">
          <Btn onClick={() => prev()}>
            <SkipBackIcon />
          </Btn>
          <Btn
            data-active={is_play_button_down}
            className={cn(
              "bg-primary text-primary-foreground hover:bg-primary/90",
              {
                "text-foreground bg-amber-400 hover:bg-amber-400/90":
                  is_play_button_down,
              },
            )}
            onClick={() => togglePlayback()}
          >
            {requestedPlaybackState === "playing" ? (
              <PauseIcon className="fill-current" />
            ) : (
              <PlayIcon />
            )}
          </Btn>

          <Btn onClick={() => skip()}>
            <SkipForwardIcon />
          </Btn>
        </div>
        <div className="flex h-10 justify-stretch gap-2 pt-2">
          <Btn
            onClick={() => {
              shuffle()
              flip()
            }}
          >
            <ShuffleIcon
              className={cn("transition", { "scale-y-[-1]": flipped })}
            />
          </Btn>
        </div>
      </div>
    </div>
  )
}

function CurrentTime() {
  const player_time = useAudioPlayer.use.currentTime()
  const requested_time = useAudioPlayer.use.requestedSeekPosition()
  const time = requested_time ?? player_time
  if (!Number.isFinite(time)) {
    return <span>--:--</span>
  }

  return <span>{toMinutes(time)}</span>
}

function Duration() {
  const duration = useAudioPlayer.use.duration()
  if (!Number.isFinite(duration)) {
    return <span>--:--</span>
  }

  return <span className="text-muted-foreground">{toMinutes(duration)}</span>
}

function toMinutes(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toFixed(0)
    .padStart(2, "0")
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")
  return `${mins}:${secs}`
}

export default Controls

function Btn({
  children,
  className,
  onClick,
  onMouseUp,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  onMouseUp?: () => void
}) {
  return (
    <button
      className={cn(
        "bg-primary text-primary-foreground hover:bg-primary/90 flex grow items-center justify-center transition active:scale-95",
        className,
      )}
      onClick={onClick}
      onMouseUp={onMouseUp}
    >
      {children}
    </button>
  )
}
