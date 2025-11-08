import CasseteImage from "@/assets/cassette.svg"
import CasseteSpool from "@/assets/cassette_spool.svg"
import { useAudioPlayer, useCurrentTrack } from "@/Player"
import { cn } from "@/client/lib/utils"

export function Cassette({ className }: { className?: string }) {
  const isPlaying = useAudioPlayer.use.isPlaying()
  const progress =
    useAudioPlayer.use.currentTime() / useAudioPlayer.use.duration()

  const currentTrackName = useCurrentTrack()?.name ?? "MIXTAPE"

  const durationTakeUp = 0.93 + (3.0 - 0.93) * progress // s/rev
  const durationSupply = 3.0 - (3.0 - 0.93) * progress // reverse relationship

  return (
    <div className={cn("aspect-video relative w-full", className)}>
      {/* supply */}
      <img
        className={cn(
          { reel: isPlaying },
          "absolute left-[23.3%] top-[44.5%] w-[16%]"
        )}
        style={{ animationDuration: durationSupply.toFixed() + "s" }}
        src={CasseteSpool}
      />
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
