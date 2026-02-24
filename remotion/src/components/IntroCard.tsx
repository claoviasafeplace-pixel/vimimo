import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface IntroCardProps {
  title: string;
  address?: string;
  price?: string;
}

export const IntroCard: React.FC<IntroCardProps> = ({ title, address, price }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring-based staggered entrance (organic deceleration)
  const titleProgress = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 80 } });
  const titleOpacity = titleProgress;
  const titleY = interpolate(titleProgress, [0, 1], [40, 0]);

  const addressProgress = spring({ frame: frame - 35, fps, config: { damping: 18, stiffness: 80 } });
  const addressOpacity = addressProgress;
  const addressY = interpolate(addressProgress, [0, 1], [25, 0]);

  const priceProgress = spring({ frame: frame - 50, fps, config: { damping: 14, stiffness: 100 } });
  const priceOpacity = priceProgress;
  const priceScale = interpolate(priceProgress, [0, 1], [0.8, 1]);

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
