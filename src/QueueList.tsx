import { XIcon } from "lucide-react"
import { useAudioPlayer } from "@/Player"
import { cn } from "@/lib/utils"
import { useEffect, useRef } from "react"

function scrollIntoViewIfNeeded(
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  element.scrollIntoView({ behavior, block: "nearest" })
}

export function PlaybackQueue({ className }: { className?: string }) {
  const tracks = useAudioPlayer.use.queueTracks()
  const has_queue = tracks.length > 0
  const queueIndex = useAudioPlayer.use.queueIndex()
  const queueRemove = useAudioPlayer.use.queueRemove()
  const queueJump = useAudioPlayer.use.queueJump()
  const active_el_ref = useRef<HTMLDivElement | null>(null)
  const container_ref = useRef<HTMLOListElement | null>(null)

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
    <ol
      className={cn(
        "flex w-full flex-col overflow-y-auto rounded-md border",
        className,
      )}
      ref={container_ref}
    >
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
  )
}

export default PlaybackQueue
