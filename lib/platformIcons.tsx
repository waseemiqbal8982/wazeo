"use client";

// Real brand SVG marks for the services menu. Lightweight, no external icons.
export function PlatformIcon({ id, size = 18 }: { id: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true };
  switch (id) {
    case "instagram":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common} fill="currentColor">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48L15.5 11.75z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5H16.7V4.6c-.29-.04-1.3-.13-2.46-.13-2.44 0-4.1 1.49-4.1 4.22v2.36H7.4V15h2.74v7z" />
        </svg>
      );
    case "telegram":
      return (
        <svg {...common} fill="currentColor">
          <path d="M21.9 4.3 19.3 19c-.2 1.1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.27.27-.5.5-1 .5l.36-5.1L18.7 7c.4-.36-.09-.56-.62-.2L7.8 13.5l-4.9-1.5c-1.06-.33-1.08-1.06.22-1.57l19.2-7.4c.88-.33 1.65.2 1.36 1.37z" />
        </svg>
      );
    case "x":
      return (
        <svg {...common} fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    default:
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}
