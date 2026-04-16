import { useAudioPlayer } from "@/Player"
import { Slider } from "@/client/components/ui/slider"
import { cn } from "./lib/utils"

export function VolumeSlider({
  className,
  direction = "vertical",
  classNameTrack,
}: {
  className?: string
  direction?: "horizontal" | "vertical"
  classNameTrack?: string
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
        classNameTrack={classNameTrack}
      />
    </>
  )
}

export default VolumeSlider
