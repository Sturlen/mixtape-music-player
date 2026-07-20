interface HlsPlayerProps {
  src: string | undefined
  audioRef: React.RefObject<HTMLAudioElement | null>
  enabled: boolean
}

// No longer needed — stream approach uses direct <audio> with range requests.
// Kept as a no-op to avoid breaking the parent component contract.
export function HlsPlayer(_props: HlsPlayerProps) {
  return null
}
