import { useState, useMemo, useDeferredValue } from "react"
import { useAudioPlayer } from "@/Player"
import { Slider } from "./ui/slider"

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

  const seekValue: [number] = useMemo(
    () => [deferredSeeking ?? currentTime ?? 0],
    [deferredSeeking, currentTime]
  )

  const onSeekStart = () => setSeeking(currentTime ?? 0)
  const onSeekChange = (val: [number]) => setSeeking(val[0])
  const onSeekEnd = () => {
    if (seeking != null) seek(seeking)
    setSeeking(null)
  }

  return (
    <div className="w-full mt-4 mb-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-10 text-right">{formatTime(seekValue[0])}</span>
        <Slider
          aria-label="Seek"
          min={0}
          max={duration ?? 0}
          value={seekValue}
          onMouseDown={onSeekStart}
          onTouchStart={onSeekStart}
          onValueChange={(val) => onSeekChange(val as [number])}
          onValueCommit={onSeekEnd}
          onMouseUp={onSeekEnd}
          onTouchEnd={onSeekEnd}
          className="flex-1"
          classNameTrack="bg-background"
        />
        <span className="w-10">{formatTime(duration)}</span>
      </div>
    </div>
  )
}
