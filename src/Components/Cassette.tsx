import CasseteImage from "@/assets/cassette_empty.svg"
import CasseteSpool from "@/assets/cassette_spool.svg"
import { Circle } from "@/Components/Circle"
import { useAudioPlayer, useCurrentTrack } from "@/Player"
import { cn } from "@/lib/utils"

const spoolScaleMin = 1.4
const spoolScaleMax = 2.3

export function Cassette({ className }: { className?: string }) {
  const isPlaying = useAudioPlayer.use.isPlaying()
  const progress =
    useAudioPlayer.use.currentTime() / useAudioPlayer.use.duration()

  const current_track = useCurrentTrack()

  const currentTrackName = current_track
    ? (current_track?.album?.name ?? current_track.name)
    : "MIXTAPE"

  const durationTakeUp = 0.93 + (3.0 - 0.93) * progress // s/rev
  const durationSupply = 3.0 - (3.0 - 0.93) * progress // reverse relationship

  // these are all implicitly updated whenever current time changes
  const scaleTakeUp = lerp(spoolScaleMin, spoolScaleMax, progress)
  const scaleSupply = lerp(spoolScaleMax, spoolScaleMin, progress)

  const spool_size = 1.25

  return (
    <div className={cn("aspect-video relative w-full", className)}>
      {/* supply */}
      <div
        className="absolute left-[23.3%] top-[44.5%] w-[16%] text-amber-950"
        style={{ scale: scaleSupply }}
      >
        <Circle />
      </div>
      {/* spool extender fix */}
      <div
        className="absolute left-[23.3%] top-[44.5%] w-[16%] text-white "
        style={{ scale: spool_size }}
      >
        <Circle />
      </div>
      {/* cover */}
      <div className="absolute left-[23.3%] top-[44.5%] w-[16%] text-gray-400 ">
        <Circle />
      </div>
      <img
        className={cn(
          { reel: isPlaying },
          "absolute left-[23.3%] top-[44.5%] w-[16%]"
        )}
        style={{ animationDuration: durationSupply.toFixed() + "s" }}
        src={CasseteSpool}
      />
      <div
        className="absolute right-[23.6%] top-[44.5%] w-[16%] text-amber-950"
        style={{ scale: scaleTakeUp }}
      >
        <Circle />
      </div>
      {/* spool extender fix */}
      <div
        className="absolute right-[23.6%] top-[44.5%] w-[16%] text-white"
        style={{ scale: spool_size }}
      >
        <Circle />
      </div>
      {/* cover */}
      <div className="absolute right-[23.6%] top-[44.5%] w-[16%] text-gray-400">
        <Circle />
      </div>

      {/* takeup */}
      <img
        className={cn(
          { reel: isPlaying },
          "absolute right-[23.6%] top-[44.5%] w-[16%]"
        )}
        src={CasseteSpool}
        style={{ animationDuration: durationTakeUp.toFixed() + "s" }}
      />
      <img className="absolute my-auto w-full" src={CasseteImage} />
      <div className="bg-white text-black text-sm font-inter overflow-ellipsis text-nowrap overflow-hidden absolute left-[10.9%] top-[24%] right-[12.1%] h-[16%] px-2">
        <span>{currentTrackName}</span>
      </div>
    </div>
  )
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
