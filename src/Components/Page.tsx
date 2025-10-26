import type { PropsWithChildren } from "react"

function Page({ children }: PropsWithChildren) {
  return <section className="h-full p-2 md:px-20 md:pt-40 ">{children}</section>
}

export default Page
