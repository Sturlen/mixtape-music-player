import { Link } from "@tanstack/react-router"
import type { PropsWithChildren } from "react"

function Page({ children }: PropsWithChildren) {
  return <section className="h-full ">{children}</section>
}

export default Page
