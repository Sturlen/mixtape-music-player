import { useCurrentTrack } from "@/Player"
import { TextScroller } from "./ui/TextScroller"

export function CurrentTrackScroller() {
  const track = useCurrentTrack()
  const title = track?.name || "No Track Playing"

  return (
    <TextScroller
      className="flex items-center whitespace-pre overflow-hidden bg-black px-4 py-3 border-2 border-green-400 rounded font-mono text-green-400 font-bold tracking-widest shadow-lg shadow-green-400/50 min-h-[40px]"
      text={"01 " + title}
      displayWidth={20}
      speed={200}
    />
  )
}
