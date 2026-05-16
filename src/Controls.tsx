import {
  PauseIcon,
  PlayIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "lucide-react"
import { useAudioPlayer } from "@/Player"
import { cn, formatTime } from "@/lib/utils"
import VolumeSlider from "@/VolumeControl"
import { Cassette } from "@/client/components/Cassette"
import { CurrentTrackScroller } from "@/client/components/CurrentTrackScroller"
import SeekBar from "@/client/components/SeekBar"
import { useListenTogetherStore } from "@/listen-together/store"
import type { ReactNode } from "react"

export function Controls() {
  const play = useAudioPlayer.use.play()
  const pause = useAudioPlayer.use.pause()
  const requestedPlaybackState = useAudioPlayer.use.requestedPlaybackState()
  const togglePlayback = requestedPlaybackState === "playing" ? pause : play
  const skip = useAudioPlayer.use.queueSkip()
  const prev = useAudioPlayer.use.queuePrev()
  const shuffle = useAudioPlayer.use.queueShuffle()

  const isShuffled = useAudioPlayer.use.isShuffled()

  const inSession = !!useListenTogetherStore((s) => s.roomId)
  const isHost = useListenTogetherStore((s) => s.isHost)
  const controlsDisabled = inSession && !isHost

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
          <PlayerButton onClick={() => prev()} disabled={controlsDisabled}>
            <SkipBackIcon />
          </PlayerButton>
          <PlayerButton
            data-active={requestedPlaybackState === "playing"}
            className={cn({
              "bg-amber-400 text-foreground hover:bg-amber-400/90":
                requestedPlaybackState === "playing",
            })}
            onClick={() => togglePlayback()}
            disabled={controlsDisabled}
          >
            {requestedPlaybackState === "playing" ? (
              <PauseIcon className="fill-current" />
            ) : (
              <PlayIcon />
            )}
          </PlayerButton>

          <PlayerButton onClick={() => skip()} disabled={controlsDisabled}>
            <SkipForwardIcon />
          </PlayerButton>
        </div>
        <div className="flex h-10 justify-stretch gap-2 pt-2">
          <PlayerButton onClick={() => shuffle()} disabled={controlsDisabled}>
            <ShuffleIcon
              className={cn("transition", { "scale-y-[-1]": isShuffled })}
            />
          </PlayerButton>
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

  return <span>{formatTime(time)}</span>
}

function Duration() {
  const duration = useAudioPlayer.use.duration()
  if (!Number.isFinite(duration)) {
    return <span>--:--</span>
  }

  return <span className="text-muted-foreground">{formatTime(duration)}</span>
}

export default Controls

function PlayerButton({
  children,
  className,
  onClick,
  disabled,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      className={cn(
        "bg-primary text-primary-foreground flex grow items-center justify-center transition active:scale-95",
        disabled && "pointer-events-none opacity-40",
        !disabled && "hover:bg-primary/90",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
