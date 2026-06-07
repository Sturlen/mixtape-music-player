import { useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  src?: string | null
  name: string
  primaryColor?: string | null
  textColor?: string | null
  className?: string
  imgClassName?: string
  noFallback?: boolean
}

export function ArtImage({
  src,
  name,
  primaryColor,
  textColor,
  className,
  imgClassName,
  noFallback,
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const showImage = !errored && src
  const showFallback = !loaded || errored || !src

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        !primaryColor && "bg-muted",
        className,
      )}
      style={primaryColor ? { backgroundColor: primaryColor } : undefined}
    >
      {showFallback && !noFallback && (
        <div
          className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs font-semibold"
          style={textColor ? { color: textColor } : undefined}
        >
          <span
            className={cn(
              "line-clamp-3 break-words",
              !textColor && "text-muted-foreground",
            )}
          >
            {name}
          </span>
        </div>
      )}
      {showImage && (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className={cn("h-full w-full object-contain", imgClassName)}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  )
}
