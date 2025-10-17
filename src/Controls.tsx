import {
  CrosshairIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "lucide-react"
import { useAudioPlayer } from "./Player"
import { cn } from "./lib/utils"

export function Controls() {
  const play = useAudioPlayer.use.play()
  const pause = useAudioPlayer.use.pause()
  const isPlaying = useAudioPlayer.use.isPlaying()
  const track = useAudioPlayer.use.currentTrack()

  const progress =
    useAudioPlayer.use.currentTime() / useAudioPlayer.use.duration()

  const durationTakeUp = 0.93 + (3.0 - 0.93) * progress // s/rev
  const durationSupply = 3.0 - (3.0 - 0.93) * progress // reverse relationship

  const spoolStyle = {
    "--progress": progress,
    "--takeup-duration": `${durationTakeUp}s`,
    "--supply-duration": `${durationSupply}s`,
  }

  return (
    <div className="bg-background rounded-2xl fixed left-4 bottom-10 z-50 p-4">
      <div className="flex p-2  justify-between">
        <CrosshairIcon
          className={cn({ reel: isPlaying })}
          style={{ animationDuration: durationSupply.toFixed() + "s" }}
        />
        <CrosshairIcon
          className={cn({ reel: isPlaying })}
          style={{ animationDuration: durationTakeUp.toFixed() + "s" }}
        />
      </div>
      <div className="bg-amber-200 text-background px-1 w-40 overflow-ellipsis text-nowrap overflow-hidden">
        <span>Now Playing: {track?.name ?? "None"}</span>
      </div>
      <div>
        <CurrentTime />
        <Duration />
      </div>
      <div>
        <button>
          <SkipBackIcon />
        </button>
        <button
          onClick={() => play()}
          style={{ background: "black", border: "white" }}
        >
          <PlayIcon />
        </button>

        <button
          onClick={() => pause()}
          style={{ background: "black", border: "white" }}
        >
          <PauseIcon />
        </button>

        <button>
          <SkipForwardIcon />
        </button>
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

  return <span style={{ color: "grey" }}>{toMinutes(duration)}</span>
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
