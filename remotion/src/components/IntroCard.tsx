import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

interface IntroCardProps {
  title: string;
  address?: string;
  price?: string;
}

export const IntroCard: React.FC<IntroCardProps> = ({ title, address, price }) => {
  const frame = useCurrentFrame();

  // Staggered fade-in with subtle slide-up
  const titleOpacity = interpolate(frame, [15, 45], [0, 1], CLAMP);
  const titleY = interpolate(frame, [15, 45], [30, 0], CLAMP);

  const addressOpacity = interpolate(frame, [35, 60], [0, 1], CLAMP);
  const addressY = interpolate(frame, [35, 60], [20, 0], CLAMP);

  const priceOpacity = interpolate(frame, [50, 75], [0, 1], CLAMP);
  const priceScale = interpolate(frame, [50, 75], [0.85, 1], CLAMP);

  // Responsive font size for long titles
  const titleSize = title.length > 35 ? 48 : title.length > 25 ? 58 : 72;
  const addressSize = address && address.length > 45 ? 26 : 34;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Title */}
      <div
        style={{
          color: "#fff",
          fontSize: titleSize,
          fontFamily: "sans-serif",
          fontWeight: 700,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          padding: "0 100px",
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          maxWidth: "90%",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </div>

      {/* Address / Neighborhood */}
      {address && (
        <div
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: addressSize,
            fontFamily: "sans-serif",
            fontWeight: 400,
            opacity: addressOpacity,
            transform: `translateY(${addressY}px)`,
            marginTop: 8,
            textAlign: "center",
            padding: "0 100px",
            letterSpacing: "0.02em",
            maxWidth: "85%",
          }}
        >
          {address}
        </div>
      )}

      {/* Price badge — gold gradient */}
      {price && (
        <div
          style={{
            opacity: priceOpacity,
            transform: `scale(${priceScale})`,
            marginTop: 28,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, #c8a45a 0%, #e8d48b 50%, #c8a45a 100%)",
              color: "#1a1a1a",
              fontSize: 30,
              fontFamily: "sans-serif",
              fontWeight: 700,
              padding: "14px 44px",
              borderRadius: 8,
              letterSpacing: "0.03em",
            }}
          >
            {price}
          </div>
        </div>
      )}

      {/* Subtle VIMIMO watermark */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          color: "rgba(255,255,255,0.12)",
          fontSize: 16,
          fontFamily: "sans-serif",
          fontWeight: 500,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
        }}
      >
        VIMIMO
      </div>
    </AbsoluteFill>
  );
};
