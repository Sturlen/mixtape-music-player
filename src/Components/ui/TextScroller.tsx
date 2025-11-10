import { cn } from "@/lib/utils"
import { useAudioPlayer, useCurrentTrack } from "@/Player"

import React, { useState, useEffect } from "react"

interface TextScrollerProps {
  text: string
  displayWidth: number
  /** milliseconds per shift */
  speed?: number
  className?: string
}

export function TextScroller({
  text,
  displayWidth,
  speed = 300,
  className,
}: TextScrollerProps) {
  const [displayText, setDisplayText] = useState(
    text.substring(0, displayWidth)
  )

  useEffect(() => {
    // Create looping text by duplicating it
    const loopingText = text + " " + text
    let currentIndex = 0

    const interval = setInterval(
      () => {
        if (text.length <= displayWidth) {
          setDisplayText(text.padEnd(displayWidth, " "))
        } else {
          currentIndex = (currentIndex + 1) % text.length
          setDisplayText(
            loopingText
              .substring(currentIndex, currentIndex + displayWidth)
              .padEnd(displayWidth, " ")
          )
        }
      },
      speed,
      text,
      displayWidth
    ) // reset when text changes

    return () => clearInterval(interval)
  }, [text, displayWidth, speed])

  return (
    <div
      className={cn("font-mono whitespace-nowrap overflow-hidden", className)}
    >
      {displayText}
    </div>
  )
}

function CurrentTime() {
  const time = useAudioPlayer.use.currentTime()
  if (!Number.isFinite(time)) {
    return <span>--:--</span>
  }

  return <span>{toMinutes(time)}</span>
}

function Duration() {
  const duration = useAudioPlayer.use.duration()
  if (!Number.isFinite(duration)) {
    return <span>--:--</span>
  }

  return <span className="text-muted-foreground">{toMinutes(duration)}</span>
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
