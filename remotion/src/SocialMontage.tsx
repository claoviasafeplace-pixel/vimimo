import React from "react";
import {
  AbsoluteFill,
  Audio,
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
  calculateSocialDuration,
  getSocialRoomStart,
  getSocialOutroStart,
} from "./social/timeline";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// ─── TikTok / Reels Safe Zones (1080×1920) ──────────────────────────
// These margins prevent text from being hidden by native UI overlays.
const SAFE = {
  top: 250,     // Username, Follow button, status bar
  bottom: 500,  // Caption, music ticker, description
  right: 200,   // Like/Comment/Share/Bookmark buttons
  left: 50,     // Minimal left margin
} as const;

/** Container style for safe-zone-constrained overlays */
const safeZoneStyle: React.CSSProperties = {
  position: "absolute",
  top: SAFE.top,
  bottom: SAFE.bottom,
  left: SAFE.left,
  right: SAFE.right,
};

// ─── Hook Screen ────────────────────────────────────────────────────

const HookScreen: React.FC<{
  hookText: string;
  firstImageUrl: string;
}> = ({ hookText, firstImageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, SOCIAL_HOOK_FRAMES], [1.15, 1.0], CLAMP);
  const textScale = spring({ frame, fps, config: { damping: 8, stiffness: 200, mass: 0.5 } });

  // Hard pop-in: invisible → full in 2 frames
  const textOpacity = interpolate(frame, [0, 2], [0, 1], CLAMP);

  // Vignette pulse
  const vignetteOpacity = interpolate(
    frame, [0, 10, 20, 30, SOCIAL_HOOK_FRAMES],
    [0.9, 0.5, 0.7, 0.5, 0.8], CLAMP,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Background image — dark, zoomed */}
      <AbsoluteFill>
        <Img
          src={firstImageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(12px) brightness(0.3) saturate(1.3)",
            transform: `scale(${bgScale})`,
          }}
        />
      </AbsoluteFill>

      {/* Heavy vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
        }}
      />

      {/* Hook text — MASSIVE, viral TikTok typography (safe zone) */}
      <div
        style={{
          ...safeZoneStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "#fff",
            textAlign: "center",
            textTransform: "uppercase",
            transform: `scale(${textScale})`,
            opacity: textOpacity,
            lineHeight: 1.05,
            letterSpacing: -2,
            // Triple text-shadow for maximum impact: glow + hard drop + outline
            textShadow: [
              "0 0 40px rgba(255,255,255,0.3)",
              "0 6px 0 rgba(0,0,0,0.9)",
              "0 8px 30px rgba(0,0,0,1)",
              "2px 2px 0 rgba(0,0,0,0.8)",
              "-2px -2px 0 rgba(0,0,0,0.8)",
              "2px -2px 0 rgba(0,0,0,0.8)",
              "-2px 2px 0 rgba(0,0,0,0.8)",
            ].join(", "),
          }}
        >
          {hookText}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Social Room Segment ────────────────────────────────────────────

// ─── Micro Flash (1-2 frame white burst on hard cuts) ────────────────

const MicroFlash: React.FC<{ at: number; currentFrame: number }> = ({ at, currentFrame }) => {
  const dist = currentFrame - at;
  if (dist < 0 || dist > 2) return null;
  const opacity = dist === 0 ? 1 : 0.4;
  return (
    <AbsoluteFill
      style={{ backgroundColor: "#fff", opacity, mixBlendMode: "screen" }}
    />
  );
};

// ─── Social Room Segment — TikTok Viral / Phonk Style ───────────────
//
// 60 frames total (4 beats at 120 BPM). Asymmetric speed ramp:
//
//   [0-7]   ORIGINAL  — 8fr flash (furniture visible)
//   [8-15]  CLEANED   — 8fr flash (empty room)
//   [16-35] VIDEO     — 20fr, playbackRate 3.5x (violent acceleration)
//   [36-59] RESULT    — 24fr, punch zoom settle (hero shot to admire)
//
// Hard cuts at frames 8, 16, 36 with 2-frame white micro-flashes.
// Zero crossfades. Zero badges. Pure impact.

const SocialRoomSegment: React.FC<{
  room: SocialMontageProps["rooms"][0];
  index: number;
}> = ({ room }) => {
  const frame = useCurrentFrame();
  const cleanedUrl = room.cleanedPhotoUrl || room.beforePhotoUrl;

  // Determine which phase is active (hard cuts, no crossfade)
  const phase =
    frame < 8 ? "original" :
    frame < 16 ? "cleaned" :
    frame < 36 ? "video" :
    "result";

  // Ken Burns on original (fast push-in during the 8-frame flash)
  const originalScale = interpolate(frame, [0, 8], [1.0, 1.1], CLAMP);

  // Cleaned: subtle reverse zoom
  const cleanedScale = interpolate(frame, [8, 16], [1.08, 1.0], CLAMP);

  // Video: slow push during accelerated playback
  const videoScale = interpolate(frame, [16, 36], [1.0, 1.06], CLAMP);

  // Result: PUNCH ZOOM — starts big, settles to 1.0
  const resultScale = interpolate(frame, [36, 42, 60], [1.12, 1.02, 1.0], CLAMP);

  // Result brightness boost on punch (flash-to-settle)
  const resultBrightness = interpolate(frame, [36, 40], [1.15, 1.0], CLAMP);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Phase 1: Original — 8 frame flash */}
      {phase === "original" && (
        <AbsoluteFill>
          <Img
            src={room.beforePhotoUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${originalScale})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Phase 2: Cleaned — 8 frame flash */}
      {phase === "cleaned" && (
        <AbsoluteFill>
          <Img
            src={cleanedUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${cleanedScale})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Phase 3: AI Video — 20 frames, violent 3.5x acceleration */}
      {phase === "video" && (
        <AbsoluteFill>
          <Video
            src={room.videoUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${videoScale})`,
            }}
            playbackRate={3.5}
            startFrom={0}
          />
        </AbsoluteFill>
      )}

      {/* Phase 4: Result hero shot — 24 frames with punch zoom */}
      {phase === "result" && (
        <AbsoluteFill>
          <Img
            src={room.stagedPhotoUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${resultScale})`,
              filter: `brightness(${resultBrightness})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Micro-flashes on each hard cut (beat-synced white bursts) */}
      <MicroFlash at={8} currentFrame={frame} />
      <MicroFlash at={16} currentFrame={frame} />
      <MicroFlash at={36} currentFrame={frame} />

      {/* Room label — minimal, bottom-left, within safe zone */}
      <div
        style={{
          ...safeZoneStyle,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: "#fff",
            textTransform: "uppercase",
            letterSpacing: 4,
            textShadow: [
              "0 2px 0 rgba(0,0,0,0.9)",
              "0 4px 20px rgba(0,0,0,0.8)",
              "1px 1px 0 rgba(0,0,0,0.7)",
              "-1px -1px 0 rgba(0,0,0,0.7)",
            ].join(", "),
          }}
        >
          {room.roomLabel}
        </div>
      </div>
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
        opacity: fadeIn,
      }}
    >
      {watermarkType !== "none" && (
        <div
          style={{
            ...safeZoneStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
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
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Flash Cut Transition ───────────────────────────────────────────

const FlashCut: React.FC = () => {
  const frame = useCurrentFrame();

  // Aggressive flash: instant full white → black → slight afterglow → gone
  const flashOpacity = interpolate(
    frame,
    [0, 1, 3, 5, SOCIAL_CUT_FRAMES],
    [1, 0.9, 0, 0.15, 0],
    CLAMP,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill
        style={{
          backgroundColor: "#fff",
          opacity: flashOpacity,
        }}
      />
    </AbsoluteFill>
  );
};

// ─── Main Composition ───────────────────────────────────────────────

// ─── Audio with Fade-Out ─────────────────────────────────────────────

const SocialAudio: React.FC<{ musicUrl: string; totalFrames: number }> = ({
  musicUrl,
  totalFrames,
}) => {
  const frame = useCurrentFrame();
  const fadeOutStart = totalFrames - SOCIAL_OUTRO_FRAMES;

  const volume = interpolate(
    frame,
    [0, 5, fadeOutStart, totalFrames],
    [0, 0.85, 0.85, 0],
    CLAMP,
  );

  return <Audio src={musicUrl} volume={volume} />;
};

// ─── Main Composition ───────────────────────────────────────────────

export const SocialMontage: React.FC<SocialMontageProps> = ({
  hookText,
  rooms,
  musicUrl,
  watermark,
}) => {
  const outroStart = getSocialOutroStart(rooms.length);
  const totalFrames = calculateSocialDuration(rooms.length);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Beat-synced audio track with fade-out during outro */}
      {musicUrl && <SocialAudio musicUrl={musicUrl} totalFrames={totalFrames} />}

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
