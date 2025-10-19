import {
  CrosshairIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from "lucide-react"
import { useAudioPlayer } from "./Player"
import { cn } from "./lib/utils"
import VolumeSlider from "./VolumeControl"

export function Controls() {
  const play = useAudioPlayer.use.play()
  const pause = useAudioPlayer.use.pause()
  const skip = useAudioPlayer.use.queueSkip()
  const prev = useAudioPlayer.use.queuePrev()
  const isPlaying = useAudioPlayer.use.isPlaying()
  const track = useAudioPlayer.use.currentTrack()

  const progress =
    useAudioPlayer.use.currentTime() / useAudioPlayer.use.duration()

  const durationTakeUp = 0.93 + (3.0 - 0.93) * progress // s/rev
  const durationSupply = 3.0 - (3.0 - 0.93) * progress // reverse relationship

  return (
    <div className="fixed left-4 bottom-10 z-50 bg-[url(cassette.webp)] bg-contain bg-center w-80 h-50 overflow-hidden bg-no-repeat flex flex-col">
      <div className="absolute left-[25px] bottom-[55px] h-[130px] w-[268px] object-cover overflow-hidden">
        <img className="absolute bottom-0 opacity-0" src={track?.artURL}></img>
        {/* TODO: implement cassette images properly */}
      </div>
      <div className="relative">
        <div className="bg-amber-50 text-background left-[28px] top-[20px] right-[28px] overflow-ellipsis text-nowrap overflow-hidden absolute h-[30px]">
          <span>{track?.name ?? "None"}</span>
        </div>
        <div>
          <CrosshairIcon
            size={"40px"}
            className={cn(
              { reel: isPlaying },
              "absolute left-[75px] top-[70px]"
            )}
            style={{ animationDuration: durationSupply.toFixed() + "s" }}
          />
          <CrosshairIcon
            size={"40px"}
            className={cn(
              { reel: isPlaying },
              "absolute left-[205px] top-[70px]"
            )}
            style={{ animationDuration: durationTakeUp.toFixed() + "s" }}
          />
        </div>

        <div className="grow"></div>

        <div className="absolute top-[120px]  left-[22px] right-[22px] flex justify-center">
          <div className="backdrop-blur-sm px-2">
            <CurrentTime />
            <Duration />
          </div>
        </div>
        <div className="absolute top-[170px] w-full left-0 right-0 flex justify-between px-4">
          <button onClick={() => prev()}>
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

          <button onClick={() => skip()}>
            <SkipForwardIcon />
          </button>
        </div>
      </div>
      <VolumeSlider />
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

  return <span className="text-muted-foreground">{toMinutes(duration)}</span>
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
