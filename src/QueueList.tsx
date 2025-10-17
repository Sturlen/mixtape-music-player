import { XIcon } from "lucide-react"
import { useAudioPlayer } from "./Player"
import { cn } from "./lib/utils"

export function PlaybackQueue() {
  const tracks = useAudioPlayer.use.queueTracks()
  const has_queue = tracks.length > 0
  const queueIndex = useAudioPlayer.use.queueIndex()

  return (
    <div
      data-active={has_queue}
      className={cn(
        "fixed left-4 bottom-80 z-50 w-80 h-50 flex flex-col invisible data-[active=true]:visible"
      )}
    >
      <div
        className="absolute bg-background overflow-hidden w-8 h-full"
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
      <section id="playback-queue" className="h-full ml-10">
        <ol className="flex flex-col-reverse h-full w-full gap-4">
          {tracks.map((tr, i) => (
            <li key="tr" className="">
              <div
                data-active={i === queueIndex}
                className="flex gap-2 data-[active=true]:bg-accent"
              >
                <div className="p-2 px-4 truncate h-10 w-100 bg-background rounded-full">
                  {tr.name}
                </div>
                <button className="bg-background hover:bg-foreground text-foreground hover:text-background rounded-full p-2">
                  <XIcon />
                </button>
              </div>
            </li>
          ))}
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
