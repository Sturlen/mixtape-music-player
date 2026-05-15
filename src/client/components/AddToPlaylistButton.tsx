import * as React from "react"
import { PlaylistSelector } from "./PlaylistSelector"

interface AddToPlaylistButtonProps {
  trackId: string
  trackName: string
  className?: string
  label?: string
  hideIcon?: boolean
}

export function AddToPlaylistButton({
  trackId,
  trackName,
  className,
  label = "Add to Mix",
  hideIcon = false,
}: AddToPlaylistButtonProps) {
  return (
    <PlaylistSelector trackId={trackId} trackName={trackName}>
      <button className={className} title="Add to mix">
        {hideIcon ? null : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v20M2 12h20" />
          </svg>
        )}
        {label}
      </button>
    </PlaylistSelector>
  )
}
