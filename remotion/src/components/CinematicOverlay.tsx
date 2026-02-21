import React from "react";
import { AbsoluteFill } from "remotion";

export const CinematicOverlay: React.FC = () => {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Top letterbox */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4.5%",
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)",
        }}
      />
      {/* Bottom letterbox */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "4.5%",
          background:
            "linear-gradient(to top, rgba(0,0,0,0.5), transparent)",
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.3) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
