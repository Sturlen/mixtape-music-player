import { useAudioPlayer } from "./Player"

export function VolumeSlider() {
  const volume = useAudioPlayer.use.volume()
  const setVolume = useAudioPlayer.use.setVolume()
  return (
    <div>
      <input
        type="range"
        className=""
        value={volume}
        max={1}
        step={0.1}
        min={0}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        style={{ writingMode: "vertical-lr", direction: "rtl" }}
      />
    </div>
  )
}

export default VolumeSlider
