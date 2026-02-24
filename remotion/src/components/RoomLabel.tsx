import React from "react";
import { interpolate, spring } from "remotion";

interface RoomLabelProps {
  label: string;
  frame: number;
  fps?: number;
}

export const RoomLabel: React.FC<RoomLabelProps> = ({
  label,
  frame,
  fps = 30,
}) => {
  const progress = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 90 },
  });
  const opacity = progress;
  const translateY = interpolate(progress, [0, 1], [18, 0]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 48,
        opacity,
        transform: `translateY(${translateY.toFixed(1)}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "#fff",
          fontSize: 28,
          fontFamily: "sans-serif",
          fontWeight: 500,
          padding: "10px 24px",
          borderRadius: 24,
          backdropFilter: "blur(8px)",
        }}
      >
        {label}
      </div>
    </div>
  );
};
