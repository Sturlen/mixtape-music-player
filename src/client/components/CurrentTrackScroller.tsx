import { useAudioPlayer, useCurrentTrack } from "@/Player"
import { TextScroller } from "./ui/TextScroller"

export function CurrentTrackScroller() {
  const track = useCurrentTrack()
  const isLoading = useAudioPlayer.use.isLoading()

  let text = "No Track Playing"

  if (isLoading) {
    text = `${track?.trackNumber ?? 1}`.padStart(3, "0") + " " + "Loading..."
  } else if (track) {
    text = `${track?.trackNumber ?? 1}`.padStart(3, "0") + " " + track.name
  }

  return (
    <TextScroller
      className="bg-background flex min-h-[40px] w-full items-center overflow-hidden rounded-md px-4 py-3 font-mono font-bold tracking-widest whitespace-pre text-blue-400"
      text={text}
      displayWidth={24}
      speed={200}
    />
  )
}
