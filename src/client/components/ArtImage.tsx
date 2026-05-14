import { useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  src?: string
  name: string
  primaryColor?: string
  className?: string
  imgClassName?: string
}

export function ArtImage({ src, name, primaryColor, className, imgClassName }: Props) {
  const [errored, setErrored] = useState(false)
  const fallback = !src || errored

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={primaryColor ? { backgroundColor: primaryColor } : undefined}
    >
      {fallback ? (
        <div className="bg-muted flex h-full w-full items-center justify-center p-2 text-center text-xs font-semibold text-muted-foreground">
          <span className="line-clamp-3 break-words">{name}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={name}
          className={cn("h-full w-full object-cover", imgClassName)}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  )
}
