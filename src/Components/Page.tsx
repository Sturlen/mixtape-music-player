import type { PropsWithChildren } from "react"

function Page({ children }: PropsWithChildren) {
  return (
    <div className="w-full h-full flex items-center flex-col bg-[url(Brudeferden.webp)] bg-center bg-fixed">
      <section className="lg:w-3/4 lg:px-10 bg-background">{children}</section>
    </div>
  )
}

export default Page
