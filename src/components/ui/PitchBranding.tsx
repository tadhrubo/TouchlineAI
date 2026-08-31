"use client";

import React from "react";
import Image from "next/image";

export const PitchBranding: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`absolute top-2 inset-x-2 sm:inset-x-3 flex items-center justify-between pointer-events-none z-0 select-none ${className}`}
  >
    {/* Left Pitchside Ad Board */}
    <div className="relative w-[96px] sm:w-[112px] h-[28px] sm:h-[32px] rounded-md overflow-hidden bg-[#0B0E14]/90 border border-white/[0.14] shadow-sm flex items-center justify-center p-0.5 opacity-85">
      <Image
        src="/asset/image/tl-pitchside.jpeg"
        alt="Touchline AI Pitchside Banner"
        width={112}
        height={32}
        className="w-full h-full object-contain"
        priority
        unoptimized
      />
    </div>

    {/* Right Pitchside Ad Board */}
    <div className="relative w-[96px] sm:w-[112px] h-[28px] sm:h-[32px] rounded-md overflow-hidden bg-[#0B0E14]/90 border border-white/[0.14] shadow-sm flex items-center justify-center p-0.5 opacity-85">
      <Image
        src="/asset/image/tl-pitchside.jpeg"
        alt="Touchline AI Pitchside Banner"
        width={112}
        height={32}
        className="w-full h-full object-contain"
        priority
        unoptimized
      />
    </div>
  </div>
);
