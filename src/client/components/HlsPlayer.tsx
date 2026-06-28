import { useEffect, useRef } from "react"
import Hls from "hls.js"

interface HlsPlayerProps {
  src: string | undefined
  audioRef: React.RefObject<HTMLAudioElement | null>
  enabled: boolean
}

// intercepts the src prop and uses hls.js to play HLS streams. sets src for the audio element.
// could be more declarative in the future
export function HlsPlayer({ src, audioRef, enabled }: HlsPlayerProps) {
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    if (!audioRef.current || !src || !enabled) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (audioRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      audioRef.current.src = src
    } else if (Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.attachMedia(audioRef.current)
      hls.loadSource(src)
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data)
        }
      })
    } else {
      console.error("HLS is not supported in this browser")
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, enabled])

  return null
}
