import {
  CrosshairIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "lucide-react"
import { useAudioPlayer } from "./Player"
import { cn } from "./lib/utils"

export function PlaybackQueue() {
  const tracks = useAudioPlayer.use.queueTracks()

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
    <div className="fixed left-4 bottom-80 z-50 bg-background w-80 h-50 overflow-y-scroll bg-no-repeat flex flex-col">
      <section id="playback-queue" className="relative h-full">
        <ol className="flex flex-col-reverse h-full">
          {tracks.map((tr) => (
            <li className="">
              <div>{tr.name}</div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
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

export default PlaybackQueue
