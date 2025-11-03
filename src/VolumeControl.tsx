import { useAudioPlayer } from "./Player"

export function VolumeSlider({
  className,
  direction = "vertical",
}: {
  className?: string
  direction?: "horizontal" | "vertical"
}) {
  const volume = useAudioPlayer.use.volume()
  const setVolume = useAudioPlayer.use.setVolume()
  return (
    <>
      <input
        type="range"
        className={className}
        value={volume}
        max={1}
        step={0.05}
        min={0}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        title="Change Volume"
        style={{
          writingMode:
            direction === "vertical" ? "vertical-lr" : "horizontal-tb",
          direction: direction === "vertical" ? "rtl" : "ltr",
        }}
      />
    </>
  )
}

export default VolumeSlider
