import {
  CrosshairIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "lucide-react"
import { useAudioPlayer, useCurrentTrack } from "@/client/Player"
import { Cassette } from "@/client/Components/Cassette"

export function Controls() {
  const play = useAudioPlayer.use.play()
  const pause = useAudioPlayer.use.pause()
  const skip = useAudioPlayer.use.queueSkip()
  const prev = useAudioPlayer.use.queuePrev()

  return (
    <div className="flex flex-col w-full items-center">
      <div className="w-70 bg-gray-400 pb-10 rounded-md">
        <Cassette />
      </div>
      <div className="w-full">
        <div className="grow"></div>

        <div className="h-6 flex justify-center items-center">
          <div className="backdrop-blur-sm px-2">
            <CurrentTime />
            <Duration />
          </div>
        </div>
        <div className="flex justify-stretch gap-2 pt-4 h-20">
          <button
            className="grow flex justify-center items-center bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => prev()}
          >
            <SkipBackIcon />
          </button>
          <button
            className="grow flex justify-center items-center bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => play()}
          >
            <PlayIcon />
          </button>

          <button
            className="grow flex justify-center items-center bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => pause()}
          >
            <PauseIcon />
          </button>

          <button
            className="grow flex justify-center items-center bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => skip()}
          >
            <SkipForwardIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

function CurrentTime() {
  const time = useAudioPlayer.use.currentTime()
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
