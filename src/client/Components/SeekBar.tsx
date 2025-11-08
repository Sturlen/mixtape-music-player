import { useState, useMemo, useDeferredValue } from "react"
import { useAudioPlayer } from "@/client/Player"

const formatTime = (s?: number) => {
  if (!s || !isFinite(s)) return "0:00"
  const min = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${min}:${sec < 10 ? "0" : ""}${sec}`
}

export default function SeekBar() {
  const duration = useAudioPlayer.use.duration()
  const currentTime = useAudioPlayer.use.currentTime()
  const seek = useAudioPlayer.use.seek()
  const [seeking, setSeeking] = useState<number | null>(null)

  // Defer the seeking state to smooth out the UI
  const deferredSeeking = useDeferredValue(seeking)

  const seekValue = useMemo(
    () => deferredSeeking ?? currentTime ?? 0,
    [deferredSeeking, currentTime]
  )

  const onSeekStart = () => setSeeking(currentTime ?? 0)
  const onSeekChange = (val: number) => setSeeking(val)
  const onSeekEnd = () => {
    if (seeking != null) seek(seeking)
    setSeeking(null)
  }

  return (
    <div className="w-full mt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-10 text-right">{formatTime(seekValue)}</span>
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
        <span className="w-10">{formatTime(duration)}</span>
      </div>
    </div>
  )
}
