import { XIcon } from "lucide-react"
import { useAudioPlayer } from "./Player"
import { cn } from "./lib/utils"

export function PlaybackQueue() {
  const tracks = useAudioPlayer.use.queueTracks()
  const has_queue = tracks.length > 0
  const queueIndex = useAudioPlayer.use.queueIndex()
  const queueRemove = useAudioPlayer.use.queueRemove()

  return (
    <div className={cn("flex flex-col")}>
      <div
        className="absolute bg-background overflow-hidden w-8 h-full hidden"
        style={{
          writingMode: "vertical-lr",
          textOrientation: "upright",
        }}
      >
        <div
          className="absolute top-[-100%] w-full h-full text-center animate-text-scroll-y left-[3px]"
          style={{
            writingMode: "vertical-lr",
            textOrientation: "upright",
          }}
        >
          NEXT UP
        </div>
        <div
          className="absolute w-full h-full text-center animate-text-scroll-y left-[3px]"
          style={{
            writingMode: "vertical-lr",
            textOrientation: "upright",
          }}
        >
          NEXT UP
        </div>
        <div
          className="absolute top-full w-full h-full text-center animate-text-scroll-y left-[3px]"
          style={{
            writingMode: "vertical-lr",
            textOrientation: "upright",
          }}
        >
          NEXT UP
        </div>
      </div>
      <section id="playback-queue" className="h-80 overflow-y-auto">
        <ol className="flex flex-col h-full">
          {tracks ? (
            tracks.map((tr, i) => (
              <li key={tr.queueId} className="">
                <div
                  data-active={i === queueIndex}
                  className="flex gap-2 data-[active=true]:bg-accent"
                >
                  <div className="p-2 px-4 truncate h-10 w-100">{tr.name}</div>
                  <button
                    onClick={() => queueRemove(i)}
                    className="hover:bg-foreground text-foreground hover:text-background  p-2"
                  >
                    <XIcon />
                  </button>
                </div>
              </li>
            ))
          ) : (
            <p>No tracks in queue.</p>
          )}
        </ol>
      </section>
    </div>
  )
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

export default PlaybackQueue
