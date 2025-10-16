import { PauseIcon, PlayIcon } from "lucide-react"
import { useAudioPlayer } from "./Player"

export function Controls() {
  const play = useAudioPlayer.use.play()
  const pause = useAudioPlayer.use.pause()
  const isPlaying = useAudioPlayer.use.isPlaying()

  return (
    <div
      style={{
        position: "fixed",
        height: "100px",
        bottom: "1rem",
        left: "1rem",
        zIndex: 999,
      }}
    >
      {isPlaying ? (
        <button
          onClick={() => pause()}
          style={{ background: "black", border: "white" }}
        >
          <PauseIcon />
        </button>
      ) : (
        <button
          onClick={() => play()}
          style={{ background: "black", border: "white" }}
        >
          <PlayIcon />
        </button>
      )}

      <div>
        <CurrentTime />
        <Duration />
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
