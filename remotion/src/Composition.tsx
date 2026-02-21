import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { CompositionProps } from "./Root";

/**
 * VIMIMO — Virtual Staging Composition
 *
 * ┌────────────────────── 10s @ 30fps = 300 frames ──────────────────────┐
 * │                                                                      │
 * │  0          60              240              300                     │
 * │  ├── INTRO ──┤──── STAGING ────┤──── OUTRO ───┤                     │
 * │  │ orig@2.0x │ higsfield@0.5x  │ higsfield@2x │                     │
 * │  │           │                 │              │                     │
 * │  │     [CROSSFADE 1]     [CROSSFADE 2]        │                     │
 * │  │     + keyframe flash  + smooth-cut blur    │                     │
 * │  │                                            │                     │
 * │  ├──────── GLOBAL CINEMATIC ZOOM 1.0→1.08 ────┤                     │
 * │                                                                      │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Chaque phase utilise un playbackRate CONSTANT dans sa propre <Sequence>.
 * OffthreadVideo calcule le source frame comme (startFrom + localFrame) * rate / fps,
 * donc un rate constant par Sequence garantit la continuité temporelle.
 *
 * La courbe de vitesse interpolate() pilote les effets visuels (blur, zoom)
 * mais PAS le playbackRate directement — évite les sauts de timeline.
 */

// ─── Shared styles ─────────────────────────────────────────────────────

const COVER: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// ─── Main Composition ──────────────────────────────────────────────────

export const VirtualStaging: React.FC<CompositionProps> = ({
  originalVideoUrl,
  aiVideoUrl,
  images,
  speedRamp,
  transitions,
  upscaling,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ────────────────────────────────────────────────────────────────────
  // 1. TIMELINE BOUNDARIES
  // ────────────────────────────────────────────────────────────────────

  const introEnd = Math.round(durationInFrames * speedRamp.introRatio); // 60
  const stagingEnd = Math.round(
    durationInFrames * (speedRamp.introRatio + speedRamp.stagingRatio),
  ); // 240
  const transHalf = Math.round(transitions.durationInFrames / 2); // 8

  // ────────────────────────────────────────────────────────────────────
  // 2. SPEED RAMP CURVE (via interpolate)
  //    Courbe continue 2x → 0.5x → 2x, transitions linéaires.
  //    Pilote: motion blur, zoom dynamique.
  // ────────────────────────────────────────────────────────────────────

  const speedCurve = interpolate(
    frame,
    [
      0,
      introEnd - transHalf,
      introEnd + transHalf,
      stagingEnd - transHalf,
      stagingEnd + transHalf,
      durationInFrames,
    ],
    [
      speedRamp.introSpeed,  // 2.0
      speedRamp.introSpeed,  // 2.0
      speedRamp.stagingSpeed, // 0.5
      speedRamp.stagingSpeed, // 0.5
      speedRamp.outroSpeed,  // 2.0
      speedRamp.outroSpeed,  // 2.0
    ],
    CLAMP,
  );

  // ────────────────────────────────────────────────────────────────────
  // 3. LAYER OPACITIES (crossfade logic)
  // ────────────────────────────────────────────────────────────────────

  // Original video: plein pendant intro, fondu sortant au crossfade 1
  const opOriginal = interpolate(
    frame,
    [introEnd - transHalf, introEnd + transHalf],
    [1, 0],
    CLAMP,
  );

  // AI video (staging @ 0.5x): fondu entrant cross1, plein, fondu sortant cross2
  const opAiStaging = interpolate(
    frame,
    [
      introEnd - transHalf,
      introEnd + transHalf,
      stagingEnd - transHalf,
      stagingEnd + transHalf,
    ],
    [0, 1, 1, 0],
    CLAMP,
  );

  // AI video (outro @ 2x): fondu entrant au crossfade 2
  const opAiOutro = interpolate(
    frame,
    [stagingEnd - transHalf, stagingEnd + transHalf],
    [0, 1],
    CLAMP,
  );

  // ────────────────────────────────────────────────────────────────────
  // 4. SMOOTH CUT BLUR (masque la différence de résolution)
  //    Gaussien qui pulse aux frontières de vitesse.
  // ────────────────────────────────────────────────────────────────────

  const blur1 = interpolate(
    frame,
    [introEnd - transHalf, introEnd, introEnd + transHalf],
    [0, transitions.smoothCutBlur, 0],
    CLAMP,
  );

  const blur2 = interpolate(
    frame,
    [stagingEnd - transHalf, stagingEnd, stagingEnd + transHalf],
    [0, transitions.smoothCutBlur * 0.7, 0],
    CLAMP,
  );

  const blurPx = Math.max(blur1, blur2);

  // ────────────────────────────────────────────────────────────────────
  // 5. GLOBAL CINEMATIC ZOOM (scale progressif)
  //    Plus rapide quand speedCurve est haute (intro/outro),
  //    plus lent quand elle est basse (staging).
  // ────────────────────────────────────────────────────────────────────

  const globalScale = interpolate(
    frame,
    [0, introEnd, stagingEnd, durationInFrames],
    [1.0, 1.03, 1.055, 1.08],
    CLAMP,
  );

  // ────────────────────────────────────────────────────────────────────
  // 6. SEQUENCE TIMING
  //    Chaque OffthreadVideo vit dans sa propre Sequence avec
  //    un playbackRate constant → timeline source correcte.
  // ────────────────────────────────────────────────────────────────────

  // Layer 1 — Original video: frame 0 → introEnd + transHalf
  const origSeqDur = introEnd + transHalf;

  // Layer 2 — AI staging (0.5x): introEnd-transHalf → stagingEnd+transHalf
  const aiStagingFrom = introEnd - transHalf;
  const aiStagingDur = stagingEnd + transHalf - aiStagingFrom;

  // Layer 3 — AI outro (2x): stagingEnd-transHalf → fin
  // Continue la vidéo Higsfield là où le staging s'est arrêté.
  //
  // Au début du crossfade 2 (comp frame stagingEnd-transHalf),
  // le staging a joué pendant (stagingEnd - introEnd) local frames
  // à 0.5x → source time = (stagingEnd - introEnd) * 0.5 / fps
  //
  // Remotion calcule: sourceTime = (startFrom + localFrame) * playbackRate / fps
  // Pour que localFrame=0 donne le même source time:
  //   startFrom * outroSpeed / fps = (stagingEnd - introEnd) * stagingSpeed / fps
  //   startFrom = (stagingEnd - introEnd) * stagingSpeed / outroSpeed
  const outroStartFrom = Math.round(
    ((stagingEnd - introEnd) * speedRamp.stagingSpeed) / speedRamp.outroSpeed,
  );
  const aiOutroFrom = stagingEnd - transHalf;
  const aiOutroDur = durationInFrames - aiOutroFrom;

  // ────────────────────────────────────────────────────────────────────
  // 7. KEYFRAME FLASH OVERLAY
  //    5 images affichées brièvement en fondu pendant le crossfade 1.
  //    Overlay discret (opacité max 0.25) — aperçu subliminal
  //    des étapes de transformation.
  // ────────────────────────────────────────────────────────────────────

  const kfPerImage = Math.max(
    3,
    Math.round(transitions.durationInFrames / 3),
  );
  const kfTotalDur = kfPerImage * 5;
  const kfStart = introEnd - Math.round(kfTotalDur / 2); // centré sur introEnd
  const KF_MAX_OPACITY = 0.25;

  // ────────────────────────────────────────────────────────────────────
  // 8. CSS FILTERS ASSEMBLY
  // ────────────────────────────────────────────────────────────────────

  const filters: string[] = [];
  if (blurPx > 0.15) filters.push(`blur(${blurPx.toFixed(1)}px)`);
  if (upscaling.enabled) {
    filters.push(`contrast(${upscaling.contrast})`);
    filters.push(`saturate(${upscaling.saturation})`);
  }
  const filterStr = filters.length > 0 ? filters.join(" ") : "none";

  // ────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ── Cinematic zoom + filters wrapper ── */}
      <AbsoluteFill
        style={{
          transform: `scale(${globalScale.toFixed(4)})`,
          transformOrigin: "center center",
          filter: filterStr,
        }}
      >
        {/* ── LAYER 1: Vidéo originale (intro @ 2x) ── */}
        <AbsoluteFill style={{ opacity: opOriginal }}>
          <Sequence
            from={0}
            durationInFrames={origSeqDur}
            layout="none"
          >
            <OffthreadVideo
              src={originalVideoUrl}
              playbackRate={speedRamp.introSpeed}
              style={COVER}
            />
          </Sequence>
        </AbsoluteFill>

        {/* ── LAYER 2: Vidéo Higsfield — staging @ 0.5x ── */}
        <AbsoluteFill style={{ opacity: opAiStaging }}>
          <Sequence
            from={aiStagingFrom}
            durationInFrames={aiStagingDur}
            layout="none"
          >
            <OffthreadVideo
              src={aiVideoUrl}
              playbackRate={speedRamp.stagingSpeed}
              style={COVER}
            />
          </Sequence>
        </AbsoluteFill>

        {/* ── LAYER 3: Vidéo Higsfield — outro @ 2x ──
             startFrom assure la continuité avec le staging.
             La vidéo Higsfield (6s) gèle sur la dernière frame
             si on dépasse sa durée → reveal final décoré. */}
        <AbsoluteFill style={{ opacity: opAiOutro }}>
          <Sequence
            from={aiOutroFrom}
            durationInFrames={aiOutroDur}
            layout="none"
          >
            <OffthreadVideo
              src={aiVideoUrl}
              startFrom={outroStartFrom}
              playbackRate={speedRamp.outroSpeed}
              style={COVER}
            />
          </Sequence>
        </AbsoluteFill>

        {/* ── LAYER 4: Keyframe flash overlay ──
             5 images en fondu rapide pendant le crossfade 1.
             Chaque image apparaît ~5 frames, opacité max 25%. */}
        {images.map((img, i) => {
          const imgStart = kfStart + i * kfPerImage;
          const imgMid = imgStart + Math.floor(kfPerImage / 2);
          const imgEnd = imgStart + kfPerImage;

          const imgOpacity = interpolate(
            frame,
            [imgStart, imgMid, imgEnd],
            [0, KF_MAX_OPACITY, 0],
            CLAMP,
          );

          if (imgOpacity <= 0.001) return null;

          return (
            <AbsoluteFill key={img.step} style={{ opacity: imgOpacity }}>
              <Img src={img.url} style={COVER} />
            </AbsoluteFill>
          );
        })}
      </AbsoluteFill>

      {/* ── CINEMATIC OVERLAY (letterbox + vignette) ── */}
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
    </AbsoluteFill>
  );
};
