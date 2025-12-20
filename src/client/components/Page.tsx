import type { PropsWithChildren } from "react"

function Page({
  children,
  className,
  title,
}: PropsWithChildren & { className?: string; title?: string }) {
  return (
    <section className={`h-full p-2 md:px-20 md:pt-40 ${className}`}>
      {title && <h1 className="mb-6 text-3xl font-bold">{title}</h1>}
      {children}
    </section>
  )
}

export default Page
