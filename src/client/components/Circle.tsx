export function Circle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      viewBox="0 0 256 256"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      fillRule="evenodd"
      clipRule="evenodd"
      strokeLinejoin="round"
      strokeMiterlimit={2}
    >
      <g transform="matrix(0.981819,0,0,0.981819,2.327136,2.327136)">
        <circle cx="128" cy="128" r="128" fill="currentColor" />
      </g>
    </svg>
  )
}
