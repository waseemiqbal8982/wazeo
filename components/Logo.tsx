interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function Logo({ size = 34, className, showText = false, textClassName = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="Wazeo">
        <path
          d="M6 34 C10 16 14 16 17 28 C19 35 23 35 25 28 C28 16 32 16 36 34"
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="41" cy="9" r="3" fill="var(--accent)" className="wazeo-pulse" />
      </svg>
      {showText && (
        <span className={`text-xl font-extrabold tracking-tight ${textClassName}`}>
          Wazeo
        </span>
      )}
    </span>
  );
}
