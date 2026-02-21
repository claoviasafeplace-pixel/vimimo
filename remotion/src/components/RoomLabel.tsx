import React from "react";
import { interpolate } from "remotion";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

interface RoomLabelProps {
  label: string;
  frame: number;
}

export const RoomLabel: React.FC<RoomLabelProps> = ({ label, frame }) => {
  const opacity = interpolate(frame, [0, 20], [0, 1], CLAMP);
  const translateY = interpolate(frame, [0, 20], [12, 0], CLAMP);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 48,
        opacity,
        transform: `translateY(${translateY}px)`,
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
