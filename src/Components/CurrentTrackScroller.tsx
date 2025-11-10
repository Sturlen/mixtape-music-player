import { useAudioPlayer, useCurrentTrack } from "@/Player"
import { TextScroller } from "./ui/TextScroller"

export function CurrentTrackScroller() {
  const track = useCurrentTrack()
  const isLoading = false // todo: fix player so it accurately reports loading

  const title = isLoading ? "Loading..." : track?.name || "No Track Playing"

  return (
    <TextScroller
      className="flex w-full items-center whitespace-pre overflow-hidden bg-background px-4 py-3 rounded-md font-mono text-blue-400 font-bold tracking-widest min-h-[40px]"
      text={"01 " + title}
      displayWidth={24}
      speed={200}
    />
  )
}
