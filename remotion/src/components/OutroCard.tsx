import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface OutroCardProps {
  watermarkType?: "vimimo" | "custom" | "none";
  agencyLogoUrl?: string;
}

export const OutroCard: React.FC<OutroCardProps> = ({
  watermarkType = "vimimo",
  agencyLogoUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Spring entrance for brand name
  const brandProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 16, stiffness: 70 },
  });
  const brandOpacity = brandProgress;
  const brandScale = interpolate(brandProgress, [0, 1], [0.9, 1]);

  // Spring entrance for subtitle (staggered)
  const subtitleProgress = spring({
    frame: frame - 28,
    fps,
    config: { damping: 18, stiffness: 80 },
  });
  const subtitleOpacity = subtitleProgress;
  const subtitleY = interpolate(subtitleProgress, [0, 1], [15, 0]);

  // Final fade-to-black over last 20 frames
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // No watermark at all
  if (watermarkType === "none") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: fadeOut,
        }}
      />
    );
  }

  // Custom agency logo
  if (watermarkType === "custom" && agencyLogoUrl) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          opacity: fadeOut,
        }}
      >
        <Img
          src={agencyLogoUrl}
          style={{
            maxHeight: 120,
            maxWidth: 400,
            opacity: brandOpacity,
            transform: `scale(${brandScale.toFixed(4)})`,
          }}
        />
      </AbsoluteFill>
    );
  }

  // Default: VIMIMO watermark
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          color: "#fff",
          fontSize: 96,
          fontFamily: "sans-serif",
          fontWeight: 700,
          opacity: brandOpacity,
          transform: `scale(${brandScale.toFixed(4)})`,
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
          transform: `translateY(${subtitleY.toFixed(1)}px)`,
          marginTop: 20,
          letterSpacing: 4,
        }}
      >
        Virtual Staging IA
      </div>
    </AbsoluteFill>
  );
};
