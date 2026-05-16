import { useState, useDeferredValue } from "react"
import { useAudioPlayer } from "@/Player"
import { formatTime } from "@/lib/utils"
import { Slider } from "./ui/slider"
import { useListenTogetherStore } from "@/listen-together/store"

export default function SeekBar({
  classNameTrack,
}: {
  classNameTrack?: string
}) {
  const duration = useAudioPlayer.use.duration()
  const currentTime = useAudioPlayer.use.currentTime()
  const seek = useAudioPlayer.use.seek()
  const [seeking, setSeeking] = useState<number | null>(null)

  const inSession = !!useListenTogetherStore((s) => s.roomId)
  const isHost = useListenTogetherStore((s) => s.isHost)
  const disabled = inSession && !isHost

  const deferredSeeking = useDeferredValue(seeking)
  const seekValue: [number] = [deferredSeeking ?? currentTime ?? 0]

  const onSeekStart = () => {
    if (disabled) return
    setSeeking(currentTime ?? 0)
  }
  const onSeekChange = (val: [number]) => setSeeking(val[0])
  const onSeekEnd = () => {
    if (disabled) return
    if (seeking != null) seek(seeking)
    setSeeking(null)
  }

  return (
    <div className="mt-4 mb-4 w-full">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
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
          classNameTrack={classNameTrack}
          disabled={disabled}
        />
        <span className="w-10">{formatTime(duration)}</span>
      </div>
    </div>
  )
}
