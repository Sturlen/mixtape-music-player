import React, { createContext, useCallback, useContext, useState } from "react"

type PlaybackDrawerContextValue = {
  open: boolean
  setOpen: (v: boolean) => void
  openDrawer: () => void
  closeDrawer: () => void
}

const PlaybackDrawerContext = createContext<
  PlaybackDrawerContextValue | undefined
>(undefined)

export const PlaybackDrawerProvider: React.FC<{
  children?: React.ReactNode
}> = ({ children }) => {
  const [open, setOpenState] = useState(false)

  const setOpen = useCallback((v: boolean) => setOpenState(v), [])
  const openDrawer = useCallback(() => setOpenState(true), [])
  const closeDrawer = useCallback(() => setOpenState(false), [])

  return (
    <PlaybackDrawerContext.Provider
      value={{ open, setOpen, openDrawer, closeDrawer }}
    >
      {children}
    </PlaybackDrawerContext.Provider>
  )
}

export function usePlaybackDrawer() {
  const ctx = useContext(PlaybackDrawerContext)
  if (!ctx)
    throw new Error(
      "usePlaybackDrawer must be used within PlaybackDrawerProvider"
    )
  return ctx
}
