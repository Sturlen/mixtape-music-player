import { EdenClient } from "@/lib/eden"
import { UserIcon } from "lucide-react"

/** Workaround for testing, since the is not yet a file watcher auto reload function. */
const ReloadButton = () => {
  return (
    <UserIcon
      onClick={() => {
        EdenClient.api.libary.reload.post()
      }}
    />
  )
}

export default ReloadButton
