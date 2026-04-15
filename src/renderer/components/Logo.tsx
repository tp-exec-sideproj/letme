interface LogoMarkProps {
  size?: number
  className?: string
}

/**
 * LetMe logo mark — stylized "L" with three ascending signal dots.
 * Represents listening + AI signal + the "L" of LetMe.
 */
export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="lm-grad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="lm-bg-glow" x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c6af7" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#7c6af7" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="100" height="100" rx="22" fill="#0b0b14" />
      {/* Subtle top glow */}
      <rect width="100" height="60" rx="22" fill="url(#lm-bg-glow)" />
      {/* Border */}
      <rect x="0.75" y="0.75" width="98.5" height="98.5" rx="21.25"
        stroke="url(#lm-grad)" strokeOpacity="0.22" strokeWidth="1.5" />

      {/* L — vertical bar */}
      <rect x="22" y="20" width="12" height="44" rx="5" fill="url(#lm-grad)" />
      {/* L — horizontal foot */}
      <rect x="22" y="52" width="38" height="12" rx="5" fill="url(#lm-grad)" />

      {/* Three signal dots — ascending diagonal (listening / AI signal) */}
      <circle cx="60" cy="34" r="4.5" fill="url(#lm-grad)" fillOpacity="0.95" />
      <circle cx="72" cy="25" r="4.5" fill="url(#lm-grad)" fillOpacity="0.65" />
      <circle cx="84" cy="16" r="4.5" fill="url(#lm-grad)" fillOpacity="0.35" />
    </svg>
  )
}

interface LogoWordmarkProps {
  size?: number
  className?: string
}

/**
 * LetMe wordmark — logo mark + "LetMe" text side by side.
 */
export function LogoWordmark({ size = 28, className }: LogoWordmarkProps) {
  return (
    <div
      className={`letme-wordmark ${className ?? ''}`}
      style={{ display: 'flex', alignItems: 'center', gap: size * 0.3 }}
    >
      <LogoMark size={size} />
      <span className="letme-wordmark-text">LetMe</span>
    </div>
  )
}
