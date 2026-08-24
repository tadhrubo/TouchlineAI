"use client";

import React from "react";
import Image from "next/image";
import { getFplKitUrl } from "@/utils/fpl";

interface JerseyProps {
  teamShort?: string;
  isGK?: boolean;
  size?: number;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  // Backward compatibility props
  primaryColor?: string;
  secondaryColor?: string;
  pattern?: "stripes" | "sleeves" | "solid" | "halves";
}

export const JerseyIcon: React.FC<JerseyProps> = ({
  teamShort = "ARS",
  isGK = false,
  size,
  width = 40,
  height = 50,
  priority = false,
  className = "",
}) => {
  const finalWidth = size ? size : width;
  const finalHeight = size ? Math.round(size * 1.22) : height;
  const kitUrl = getFplKitUrl(teamShort, isGK);

  return (
    <div
      className={`relative flex items-center justify-center select-none flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      style={{ width: finalWidth, height: finalHeight }}
    >
      <Image
        src={kitUrl}
        alt={`${teamShort} ${isGK ? "GK" : "Outfield"} Kit`}
        width={finalWidth}
        height={finalHeight}
        priority={priority}
        className="w-full h-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
      />
    </div>
  );
};
