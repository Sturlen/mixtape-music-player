import { CassetteBody } from "@/client/components/CassetteBody"
import CasseteSpool from "@/assets/cassette_spool.svg"
import { Circle } from "@/client/components/Circle"
import { useCurrentTrack, useIsPlaying, useQueueProgress } from "@/Player"
import { cn } from "@/lib/utils"

const spoolScaleMin = 1.4
const spoolScaleMax = 2.3

export function Cassette({ className }: { className?: string }) {
  const isPlaying = useIsPlaying()
  const progress = useQueueProgress()

  const current_track = useCurrentTrack()
  const primaryColor = current_track?.primaryColor
  const supportingColor = current_track?.supportingColor

  const currentTrackName = current_track
    ? (current_track?.album?.name ?? current_track.name)
    : "MIXTAPE"

  const durationTakeUp = 0.93 + (3.0 - 0.93) * progress
  const durationSupply = 3.0 - (3.0 - 0.93) * progress

  const scaleTakeUp = lerp(spoolScaleMin, spoolScaleMax, progress)
  const scaleSupply = lerp(spoolScaleMax, spoolScaleMin, progress)

  const spool_size = 1.25

  return (
    <div className={cn("relative aspect-video w-full", className)}>
      {/* supply */}
      <div
        className="absolute top-[44.5%] left-[23.3%] w-[16%] text-amber-950"
        style={{ scale: scaleSupply }}
      >
        <Circle />
      </div>
      <div
        className="absolute top-[44.5%] left-[23.3%] w-[16%] text-white"
        style={{ scale: spool_size }}
      >
        <Circle />
      </div>
      <div className="absolute top-[44.5%] left-[23.3%] w-[16%] text-gray-400">
        <Circle />
      </div>
      <img
        className={cn(
          { reel: isPlaying },
          "absolute top-[44.5%] left-[23.3%] w-[16%]",
        )}
        style={{ animationDuration: durationSupply.toFixed() + "s" }}
        src={CasseteSpool}
      />
      <div
        className="absolute top-[44.5%] right-[23.6%] w-[16%] text-amber-950"
        style={{ scale: scaleTakeUp }}
      >
        <Circle />
      </div>
      <div
        className="absolute top-[44.5%] right-[23.6%] w-[16%] text-white"
        style={{ scale: spool_size }}
      >
        <Circle />
      </div>
      <div className="absolute top-[44.5%] right-[23.6%] w-[16%] text-gray-400">
        <Circle />
      </div>

      {/* takeup */}
      <img
        className={cn(
          { reel: isPlaying },
          "absolute top-[44.5%] right-[23.6%] w-[16%]",
        )}
        src={CasseteSpool}
        style={{ animationDuration: durationTakeUp.toFixed() + "s" }}
      />
      <div className="absolute my-auto w-full">
        <CassetteBody mainColor={primaryColor} accentColor={supportingColor} />
      </div>
      <div className="font-inter absolute top-[24%] right-[12.1%] left-[10.9%] h-[16%] overflow-hidden bg-white px-2 text-sm text-nowrap overflow-ellipsis text-black">
        <span>{currentTrackName}</span>
      </div>
    </div>
  )
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
