import type { PropsWithChildren } from "react"

function Page({
  children,
  className,
}: PropsWithChildren & { className?: string }) {
  return (
    <section className={`h-full p-2 md:px-20 md:pt-40 ${className}`}>
      {children}
    </section>
  )
}

export default Page
