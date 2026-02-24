import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Room } from "../schemas";
import { RoomLabel } from "./RoomLabel";
import { SplitReveal } from "./SplitReveal";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const COVER: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

interface RoomSegmentProps {
  room: Room;
}

// Total: 210 frames (7s at 30fps)
// [0-40]    Before photo (original with furniture) + "AVANT" badge + Ken Burns
// [40-70]   SplitReveal wipe (before → staged) — the big reveal
// [70-180]  OffthreadVideo (Kling morph)
// [180-210] Staged photo + "APRES" badge

const BadgeStyle: React.CSSProperties = {
  position: "absolute",
  top: 40,
  left: 48,
  display: "flex",
  alignItems: "center",
  gap: 0,
};

const BadgePill: React.CSSProperties = {
  fontSize: 22,
  fontFamily: "sans-serif",
  fontWeight: 700,
  padding: "8px 20px",
  borderRadius: 20,
  letterSpacing: 2,
  textTransform: "uppercase" as const,
};

export const RoomSegment: React.FC<RoomSegmentProps> = ({ room }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const beforeUrl = room.beforePhotoUrl || room.originalPhotoUrl;

  // Ken Burns scale for before photo
  const kenBurnsScale = interpolate(frame, [0, 40], [1.0, 1.04], CLAMP);

  // SplitReveal progress
  const splitProgress = interpolate(frame, [40, 70], [0, 1], CLAMP);

  // Crossfade: before → split reveal (5-frame overlap around frame 40)
  const opBefore = interpolate(frame, [37, 42], [1, 0], CLAMP);
  const opSplit = interpolate(frame, [37, 42], [0, 1], CLAMP);

  // Crossfade: split reveal → video (5-frame overlap around frame 70)
  const opSplitOut = interpolate(frame, [67, 72], [1, 0], CLAMP);
  const opVideo = interpolate(frame, [67, 72], [0, 1], CLAMP);

  // Crossfade: video → staged photo (5-frame overlap around frame 180)
  const opVideoOut = interpolate(frame, [177, 182], [1, 0], CLAMP);
  const opStaged = interpolate(frame, [177, 182], [0, 1], CLAMP);

  // Badge animations — spring physics for organic entrance
  const avantProgress = spring({ frame: frame - 5, fps, config: { damping: 16, stiffness: 100 } });
  const avantOpacity = avantProgress;
  const avantY = interpolate(avantProgress, [0, 1], [10, 0]);

  const apresProgress = spring({ frame: frame - 185, fps, config: { damping: 16, stiffness: 100 } });
  const apresOpacity = apresProgress;
  const apresY = interpolate(apresProgress, [0, 1], [10, 0]);

  // RoomLabel entrance (relative to frame 190)
  const labelFrame = Math.max(0, frame - 190);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Phase 1: Before photo (with furniture) + "AVANT" badge [0-42] */}
      <Sequence from={0} durationInFrames={43} layout="none">
        <AbsoluteFill style={{ opacity: opBefore }}>
          <Img
            src={beforeUrl}
            style={{
              ...COVER,
              transform: `scale(${kenBurnsScale.toFixed(4)})`,
              transformOrigin: "center center",
            }}
          />
          {/* AVANT badge — spring slide-down */}
          <div style={{ ...BadgeStyle, opacity: avantOpacity, transform: `translateY(${avantY.toFixed(1)}px)` }}>
            <div
              style={{
                ...BadgePill,
                backgroundColor: "rgba(0,0,0,0.7)",
                color: "#fff",
                backdropFilter: "blur(8px)",
              }}
            >
              AVANT
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Phase 2: SplitReveal wipe (before → staged) [37-72] */}
      <Sequence from={37} durationInFrames={36} layout="none">
        <AbsoluteFill
          style={{ opacity: Math.min(opSplit, opSplitOut) }}
        >
          <SplitReveal
            originalUrl={beforeUrl}
            stagedUrl={room.originalPhotoUrl}
            progress={splitProgress}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Phase 3: Video [67-182] */}
      <Sequence from={67} durationInFrames={116} layout="none">
        <AbsoluteFill style={{ opacity: Math.min(opVideo, opVideoOut) }}>
          <OffthreadVideo
            src={room.videoUrl}
            playbackRate={1.0}
            style={COVER}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Phase 4: Staged photo + "APRES" badge + RoomLabel [177-210] */}
      <Sequence from={177} durationInFrames={33} layout="none">
        <AbsoluteFill style={{ opacity: opStaged }}>
          <Img src={room.stagedPhotoUrl} style={COVER} />
          {/* APRES badge — spring slide-down */}
          <div style={{ ...BadgeStyle, opacity: apresOpacity, transform: `translateY(${apresY.toFixed(1)}px)` }}>
            <div
              style={{
                ...BadgePill,
                backgroundColor: "rgba(255,255,255,0.9)",
                color: "#000",
                backdropFilter: "blur(8px)",
              }}
            >
              APRES
            </div>
          </div>
          <RoomLabel label={room.roomLabel} frame={labelFrame} fps={fps} />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
