import { XIcon } from "lucide-react"
import { useAudioPlayer } from "@/Player"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/Components/ui/scroll-area"
import { useEffect, useRef } from "react"

// Check if target element is fully visible within the container's scroll view
function scrollIntoViewIfNeeded(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const cRect = container.getBoundingClientRect()
  const eRect = element.getBoundingClientRect()

  const overTop = eRect.top < cRect.top
  const overBottom = eRect.bottom > cRect.bottom

  console.log("scrollIntoViewIfNeeded:", {
    overTop,
    overBottom,
    eRect: { top: eRect.top, bottom: eRect.bottom },
    cRect: { top: cRect.top, bottom: cRect.bottom },
    scrollTop: container.scrollTop,
  })

  if (overTop) {
    const newScroll = container.scrollTop + (eRect.top - cRect.top) - 8
    console.log("Scrolling up to:", newScroll)
    container.scrollTo({
      top: newScroll,
      behavior,
    })
  } else if (overBottom) {
    const newScroll = container.scrollTop + (eRect.bottom - cRect.bottom) + 8
    console.log("Scrolling down to:", newScroll)
    container.scrollTo({
      top: newScroll,
      behavior,
    })
  }
}

export function PlaybackQueue() {
  const tracks = useAudioPlayer.use.queueTracks()
  const has_queue = tracks.length > 0
  const queueIndex = useAudioPlayer.use.queueIndex()
  const queueRemove = useAudioPlayer.use.queueRemove()
  const queueJump = useAudioPlayer.use.queueJump()
  const active_el_ref = useRef<HTMLDivElement | null>(null)
  const container_ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!active_el_ref.current || !container_ref.current) {
      return
    }

    scrollIntoViewIfNeeded(
      container_ref.current,
      active_el_ref.current,
      "smooth",
    )
  }, [queueIndex])

  return (
    <div className={cn("flex w-full flex-col justify-stretch")}>
      <div
        id="playback-queue"
        ref={container_ref}
        className="h-[300px] overflow-y-auto rounded-md border"
      >
        <ol className="flex h-full w-full flex-col">
          {tracks ? (
            tracks.map((tr, i) => (
              <li key={tr.queueId} className="">
                <div
                  ref={i === queueIndex ? active_el_ref : undefined}
                  data-active={i === queueIndex}
                  className="data-[active=true]:bg-accent hover:bg-muted flex cursor-pointer items-stretch gap-2"
                  onClick={() => queueJump(i)}
                >
                  <div className="h-10 grow truncate p-2 px-4">{tr.name}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      queueRemove(i)
                    }}
                    className="hover:bg-foreground text-foreground hover:text-background justify-self-end p-2"
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
      </div>
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
