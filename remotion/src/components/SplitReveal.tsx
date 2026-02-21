import React from "react";
import { AbsoluteFill, Img } from "remotion";

const COVER: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

interface SplitRevealProps {
  originalUrl: string;
  stagedUrl: string;
  progress: number;
}

export const SplitReveal: React.FC<SplitRevealProps> = ({
  originalUrl,
  stagedUrl,
  progress,
}) => {
  const pct = Math.min(1, Math.max(0, progress)) * 100;

  return (
    <AbsoluteFill>
      {/* Staged photo (full background) */}
      <AbsoluteFill>
        <Img src={stagedUrl} style={COVER} />
      </AbsoluteFill>

      {/* Original photo (clipped from left, shrinks as progress increases) */}
      <AbsoluteFill
        style={{
          clipPath: `inset(0 ${pct}% 0 0)`,
        }}
      >
        <Img src={originalUrl} style={COVER} />
      </AbsoluteFill>

      {/* Vertical split cursor */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${100 - pct}%`,
          width: 3,
          backgroundColor: "#fff",
          transform: "translateX(-50%)",
          boxShadow: "0 0 8px rgba(0,0,0,0.4)",
        }}
      />
    </AbsoluteFill>
  );
};
