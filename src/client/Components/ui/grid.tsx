import type { PropsWithChildren } from "react"

interface GridLayoutProps extends PropsWithChildren {
  className?: string
}

export function GridLayout({ children, className = "" }: GridLayoutProps) {
  return (
    <ol
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-6 gap-4 ${className}`}
    >
      {children}
    </ol>
  )
}
