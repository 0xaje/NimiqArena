import React from "react";

interface NimiqArenaLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function NimiqArenaLogo({
  size = 36,
  className = "",
  showText = false,
}: NimiqArenaLogoProps) {
  return (
    <div
      className={`nimiq-arena-logo-wrapper ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        userSelect: "none",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="nimHexGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#ec9918" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="nimShieldGrad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ec9918" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Outer Golden Nimiq Hexagon */}
        <polygon
          points="24,3 43,14 43,34 24,45 5,34 5,14"
          fill="url(#nimHexGrad)"
          filter="url(#goldGlow)"
        />

        {/* Inner Dark Shield */}
        <polygon
          points="24,7 39,16 39,32 24,41 9,32 9,16"
          fill="url(#nimShieldGrad)"
          stroke="#fef08a"
          strokeWidth="1"
          strokeOpacity="0.4"
        />

        {/* Nimiq Central Core Diamond */}
        <polygon
          points="24,14 32,24 24,34 16,24"
          fill="url(#nimHexGrad)"
        />

        {/* Arena Star Accent */}
        <circle cx="24" cy="24" r="2.5" fill="#ffffff" />
      </svg>

      {showText && (
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "2.5px",
              color: "#fbbf24",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            NIMIQ
          </span>
          <span
            style={{
              fontSize: "1.05rem",
              fontWeight: 900,
              letterSpacing: "1px",
              color: "#ffffff",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            ARENA
          </span>
        </div>
      )}
    </div>
  );
}
