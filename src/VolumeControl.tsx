import { useAudioPlayer } from "@/Player"
import { Slider } from "@/client/components/ui/slider"

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
      <Slider
        className={className}
        value={[volume]}
        max={1}
        step={0.05}
        min={0}
        onValueChange={(val) => setVolume(val[0]!)}
        title="Change Volume"
        orientation={direction}
        classNameTrack="bg-background"
      />
    </>
  )
}

export default VolumeSlider
