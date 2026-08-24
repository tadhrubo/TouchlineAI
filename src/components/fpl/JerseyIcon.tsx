import React from "react";

interface JerseyProps {
  primaryColor?: string;
  secondaryColor?: string;
  pattern?: "stripes" | "sleeves" | "solid" | "halves";
  className?: string;
  size?: number;
}

export const JerseyIcon: React.FC<JerseyProps> = ({
  primaryColor = "#EF0107",
  secondaryColor = "#FFFFFF",
  pattern = "sleeves",
  className = "w-10 h-10",
  size = 40,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-md transition-transform duration-200 group-hover:scale-105 ${className}`}
    >
      <defs>
        {/* Shadow filter */}
        <filter id="jersey-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.4" />
        </filter>

        {/* Diagonal lighting gradient */}
        <linearGradient id="jersey-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </linearGradient>

        {/* Stripes pattern mask */}
        <pattern id="stripes-pattern" width="8" height="64" patternUnits="userSpaceOnUse">
          <rect width="4" height="64" fill={primaryColor} />
          <rect x="4" width="4" height="64" fill={secondaryColor} />
        </pattern>
      </defs>

      <g filter="url(#jersey-shadow)">
        {/* Base Jersey Body & Sleeves Outline */}
        {/* Sleeves */}
        {pattern === "sleeves" ? (
          <>
            {/* Left Sleeve (White or Secondary) */}
            <path
              d="M12 16 L2 28 L11 34 L18 24 Z"
              fill={secondaryColor}
              stroke="#0f172a"
              strokeWidth="0.8"
            />
            {/* Right Sleeve */}
            <path
              d="M52 16 L62 28 L53 34 L46 24 Z"
              fill={secondaryColor}
              stroke="#0f172a"
              strokeWidth="0.8"
            />
          </>
        ) : (
          <>
            {/* Left Sleeve */}
            <path
              d="M12 16 L2 28 L11 34 L18 24 Z"
              fill={pattern === "stripes" ? "url(#stripes-pattern)" : primaryColor}
              stroke="#0f172a"
              strokeWidth="0.8"
            />
            {/* Right Sleeve */}
            <path
              d="M52 16 L62 28 L53 34 L46 24 Z"
              fill={pattern === "stripes" ? "url(#stripes-pattern)" : primaryColor}
              stroke="#0f172a"
              strokeWidth="0.8"
            />
          </>
        )}

        {/* Sleeve Cuffs */}
        <path d="M2 28 L11 34" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M62 28 L53 34" stroke={secondaryColor} strokeWidth="1.5" strokeLinecap="round" />

        {/* Main Body */}
        {pattern === "stripes" ? (
          <path
            d="M16 16 C16 16 23 12 32 12 C41 12 48 16 48 16 L50 54 C50 55 49 56 47 56 L17 56 C15 56 14 55 14 54 Z"
            fill="url(#stripes-pattern)"
            stroke="#0f172a"
            strokeWidth="0.8"
          />
        ) : (
          <path
            d="M16 16 C16 16 23 12 32 12 C41 12 48 16 48 16 L50 54 C50 55 49 56 47 56 L17 56 C15 56 14 54 14 54 Z"
            fill={primaryColor}
            stroke="#0f172a"
            strokeWidth="0.8"
          />
        )}

        {/* Collar & Neck Cutout */}
        <path
          d="M24 13.5 C24 18 40 18 40 13.5"
          stroke={secondaryColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M26 14 C26 17 38 17 38 14"
          fill="#0B0F17"
        />

        {/* Realistic Jersey lighting overlay */}
        <path
          d="M16 16 C16 16 23 12 32 12 C41 12 48 16 48 16 L50 54 C50 55 49 56 47 56 L17 56 C15 56 14 54 14 54 Z"
          fill="url(#jersey-sheen)"
        />

        {/* Subtle center chest sponsor / crest hint */}
        <circle cx="23" cy="24" r="2.2" fill={secondaryColor} opacity="0.85" />
        <rect x="25" y="32" width="14" height="2.5" rx="1.2" fill={secondaryColor} opacity="0.65" />
      </g>
    </svg>
  );
};
