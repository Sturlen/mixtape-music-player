import { useAudioPlayer, useCurrentTrack } from "@/Player"
import { TextScroller } from "./ui/TextScroller"

export function CurrentTrackScroller() {
  const track = useCurrentTrack()
  const isLoading = useAudioPlayer.use.isLoading()

  const title = isLoading ? "Loading..." : track?.name || "No Track Playing"

  return (
    <TextScroller
      className="bg-background flex min-h-[40px] w-full items-center overflow-hidden rounded-md px-4 py-3 font-mono font-bold tracking-widest whitespace-pre text-blue-400"
      text={"01 " + title}
      displayWidth={24}
      speed={200}
    />
  )
}
