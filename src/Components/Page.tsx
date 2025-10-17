import type { PropsWithChildren } from "react"

function Page({ children }: PropsWithChildren) {
  return (
    <div className="w-full h-full flex items-center flex-col bg-[url(Brudeferden.webp)] bg-center bg-fixed">
      <section className="bg-background w-full xl:ml-[42rem] px-8">
        {children}
      </section>
    </div>
  )
}

export default Page
