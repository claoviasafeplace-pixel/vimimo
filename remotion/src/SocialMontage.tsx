import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Img,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import type { SocialMontageProps } from "./schemas";
import {
  SOCIAL_HOOK_FRAMES,
  SOCIAL_ROOM_FRAMES,
  SOCIAL_CUT_FRAMES,
  SOCIAL_OUTRO_FRAMES,
  getSocialRoomStart,
  getSocialOutroStart,
} from "./social/timeline";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// ─── Hook Screen ────────────────────────────────────────────────────

const HookScreen: React.FC<{
  hookText: string;
  firstImageUrl: string;
}> = ({ hookText, firstImageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, SOCIAL_HOOK_FRAMES], [1.1, 1.0], CLAMP);
  const textScale = spring({ frame, fps, config: { damping: 12, stiffness: 100, mass: 0.8 } });
  const textOpacity = interpolate(frame, [0, 10], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Blurred background */}
      <AbsoluteFill>
        <Img
          src={firstImageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(20px) brightness(0.4)",
            transform: `scale(${bgScale})`,
          }}
        />
      </AbsoluteFill>

      {/* Hook text */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#fff",
            textAlign: "center",
            textShadow: "0 4px 30px rgba(0,0,0,0.8)",
            transform: `scale(${textScale})`,
            opacity: textOpacity,
            lineHeight: 1.2,
            letterSpacing: -1,
          }}
        >
          {hookText}
        </div>
      </AbsoluteFill>

      {/* Bottom gradient */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(transparent 70%, rgba(0,0,0,0.8) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ─── Social Room Segment ────────────────────────────────────────────

const SocialRoomSegment: React.FC<{
  room: SocialMontageProps["rooms"][0];
  index: number;
}> = ({ room, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase timing within SOCIAL_ROOM_FRAMES (40 frames)
  // Before photo: 0-10 (0.33s)
  // Wipe reveal: 10-18 (0.27s)
  // Video: 12-35 (0.77s, accelerated)
  // Staged beauty: 33-40 (0.23s)

  const beforeOpacity = interpolate(frame, [0, 10, 12], [1, 1, 0], CLAMP);
  const videoOpacity = interpolate(frame, [10, 12, 33, 36], [0, 1, 1, 0], CLAMP);
  const stagedOpacity = interpolate(frame, [33, 36], [0, 1], CLAMP);

  // Ken Burns on before
  const beforeScale = interpolate(frame, [0, 12], [1.0, 1.08], CLAMP);

  // Video zoom
  const videoScale = interpolate(frame, [12, 35], [1.0, 1.04], CLAMP);

  // Staged reveal
  const stagedScale = interpolate(frame, [33, 40], [1.06, 1.0], CLAMP);

  // Label
  const labelOpacity = interpolate(frame, [5, 8], [0, 1], CLAMP);

  // "AVANT" badge
  const avantOpacity = interpolate(frame, [2, 5, 10, 12], [0, 1, 1, 0], CLAMP);

  // "APRES" badge
  const apresOpacity = interpolate(frame, [34, 37], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Before photo */}
      <AbsoluteFill style={{ opacity: beforeOpacity }}>
        <Img
          src={room.beforePhotoUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${beforeScale})`,
          }}
        />
      </AbsoluteFill>

      {/* AI Video (accelerated) */}
      <AbsoluteFill style={{ opacity: videoOpacity }}>
        <Video
          src={room.videoUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${videoScale})`,
          }}
          playbackRate={2.5}
          startFrom={0}
        />
      </AbsoluteFill>

      {/* Staged beauty shot */}
      <AbsoluteFill style={{ opacity: stagedOpacity }}>
        <Img
          src={room.stagedPhotoUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${stagedScale})`,
          }}
        />
      </AbsoluteFill>

      {/* AVANT badge */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          padding: "0 40px 180px",
          opacity: avantOpacity,
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            padding: "8px 24px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <span style={{ color: "#fff", fontSize: 28, fontWeight: 700, letterSpacing: 3 }}>
            AVANT
          </span>
        </div>
      </AbsoluteFill>

      {/* APRES badge */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          padding: "0 40px 180px",
          opacity: apresOpacity,
        }}
      >
        <div
          style={{
            background: "rgba(200,164,90,0.8)",
            backdropFilter: "blur(8px)",
            padding: "8px 24px",
            borderRadius: 8,
            border: "1px solid rgba(255,215,130,0.5)",
          }}
        >
          <span style={{ color: "#fff", fontSize: 28, fontWeight: 700, letterSpacing: 3 }}>
            APRES
          </span>
        </div>
      </AbsoluteFill>

      {/* Room label */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          padding: "0 40px 120px",
          opacity: labelOpacity,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
            padding: "6px 20px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <span style={{ color: "#fff", fontSize: 22, fontWeight: 500 }}>
            {room.roomLabel}
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Social Outro ───────────────────────────────────────────────────

const SocialOutro: React.FC<{
  watermarkType?: "vimimo" | "custom" | "none";
}> = ({ watermarkType }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [0, 1], CLAMP);
  const textScale = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeIn,
      }}
    >
      {watermarkType !== "none" && (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: 8,
              transform: `scale(${textScale})`,
            }}
          >
            VIMIMO
          </div>
          <div
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.5)",
              marginTop: 12,
              opacity: interpolate(frame, [15, 30], [0, 1], CLAMP),
            }}
          >
            Virtual Staging IA
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Flash Cut Transition ───────────────────────────────────────────

const FlashCut: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 2, 4, SOCIAL_CUT_FRAMES],
    [0, 0.8, 0.4, 0],
    CLAMP,
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#fff",
        opacity,
        mixBlendMode: "screen",
      }}
    />
  );
};

// ─── Main Composition ───────────────────────────────────────────────

export const SocialMontage: React.FC<SocialMontageProps> = ({
  hookText,
  rooms,
  watermark,
}) => {
  const outroStart = getSocialOutroStart(rooms.length);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Hook screen */}
      <Sequence from={0} durationInFrames={SOCIAL_HOOK_FRAMES} layout="none">
        <HookScreen hookText={hookText} firstImageUrl={rooms[0].stagedPhotoUrl} />
      </Sequence>

      {/* Room segments */}
      {rooms.map((room, i) => {
        const roomStart = getSocialRoomStart(i);
        return (
          <Sequence
            key={`room-${i}`}
            from={roomStart}
            durationInFrames={SOCIAL_ROOM_FRAMES}
            layout="none"
          >
            <SocialRoomSegment room={room} index={i} />
          </Sequence>
        );
      })}

      {/* Flash cuts between rooms */}
      {rooms.slice(0, -1).map((_, i) => {
        const cutStart = getSocialRoomStart(i) + SOCIAL_ROOM_FRAMES;
        return (
          <Sequence
            key={`cut-${i}`}
            from={cutStart}
            durationInFrames={SOCIAL_CUT_FRAMES}
            layout="none"
          >
            <FlashCut />
          </Sequence>
        );
      })}

      {/* Outro */}
      <Sequence
        from={outroStart}
        durationInFrames={SOCIAL_OUTRO_FRAMES}
        layout="none"
      >
        <SocialOutro watermarkType={watermark?.type} />
      </Sequence>
    </AbsoluteFill>
  );
};
