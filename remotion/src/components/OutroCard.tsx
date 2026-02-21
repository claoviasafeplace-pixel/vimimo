import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const OutroCard: React.FC = () => {
  const frame = useCurrentFrame();

  const brandOpacity = interpolate(frame, [10, 40], [0, 1], CLAMP);
  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], CLAMP);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          color: "#fff",
          fontSize: 96,
          fontFamily: "sans-serif",
          fontWeight: 700,
          opacity: brandOpacity,
          letterSpacing: 12,
        }}
      >
        VIMIMO
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: 32,
          fontFamily: "sans-serif",
          fontWeight: 400,
          opacity: subtitleOpacity,
          marginTop: 20,
          letterSpacing: 4,
        }}
      >
        Virtual Staging IA
      </div>
    </AbsoluteFill>
  );
};
