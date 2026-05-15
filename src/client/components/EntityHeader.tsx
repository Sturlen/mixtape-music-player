import type { ReactNode } from "react"

export function EntityHeader({
  image,
  title,
  children,
  primaryColor,
  textColor,
}: {
  image: ReactNode
  title: string
  children?: ReactNode
  primaryColor?: string | null
  textColor?: string | null
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="size-48 shrink-0"
        style={primaryColor ? { backgroundColor: primaryColor } : undefined}
      >
        {image}
      </div>
      <div className="flex flex-col items-center text-center">
        <h1 className="line-clamp-2 text-3xl leading-tight font-black md:text-4xl">
          {title}
        </h1>
        {children}
      </div>
    </div>
  )
}
