import { XIcon } from "lucide-react"
import { useAudioPlayer } from "@/Player"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/Components/ui/scroll-area"
import { useEffect, useRef } from "react"

// TODO: not working as expected. too aggressive. is the ref <li> patch that is the issue?
function areElementsIntersecting<T extends HTMLElement, U extends HTMLElement>(
  targetElement: T,
  containerElement: U
) {
  const rectElem = targetElement.getBoundingClientRect()
  const rectContainer = containerElement.getBoundingClientRect()

  // Consider element fully inside container only when all edges are within container's visible bounds.
  const epsilon = 0.5
  return (
    rectElem.top >= rectContainer.top - epsilon &&
    rectElem.left >= rectContainer.left - epsilon &&
    rectElem.bottom <= rectContainer.bottom + epsilon &&
    rectElem.right <= rectContainer.right + epsilon
  )
}

export function PlaybackQueue() {
  const tracks = useAudioPlayer.use.queueTracks()
  const has_queue = tracks.length > 0
  const queueIndex = useAudioPlayer.use.queueIndex()
  const queueRemove = useAudioPlayer.use.queueRemove()
  const queueJump = useAudioPlayer.use.queueJump()
  const active_el_ref = useRef<HTMLDivElement | null>(null)
  const container_ref = useRef<HTMLOListElement | null>(null)
  const prev_queue_index_ref = useRef(queueIndex)

  useEffect(() => {
    const prev_index = prev_queue_index_ref.current
    prev_queue_index_ref.current = queueIndex

    const moving_down = queueIndex > prev_index

    if (!active_el_ref.current || !container_ref.current) {
      return
    }

    if (areElementsIntersecting(container_ref.current, active_el_ref.current)) {
      return
    }

    if (moving_down) {
      active_el_ref.current.scrollIntoView({ behavior: "smooth", block: "end" })
    } else {
      active_el_ref.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }

    console.log("scroll")
  }, [queueIndex])

  return (
    <div className={cn("flex flex-col justify-stretch w-full")}>
      <div
        id="playback-queue"
        className="overflow-y-auto border rounded-md h-[300px]"
      >
        <ol ref={container_ref} className="flex flex-col h-full w-full">
          {tracks ? (
            tracks.map((tr, i) => (
              <li key={tr.queueId} className="">
                <div
                  ref={i === queueIndex ? active_el_ref : undefined}
                  data-active={i === queueIndex}
                  className="flex gap-2 data-[active=true]:bg-accent items-stretch cursor-pointer hover:bg-muted"
                  onClick={() => queueJump(i)}
                >
                  <div className="p-2 px-4 truncate h-10 grow">{tr.name}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      queueRemove(i)
                    }}
                    className="hover:bg-foreground text-foreground hover:text-background p-2 justify-self-end"
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
