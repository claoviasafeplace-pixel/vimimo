import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { StudioMontageProps } from "./schemas";
import { StudioIntro } from "./studio/StudioIntro";
import { StudioRoomSegment } from "./studio/StudioRoomSegment";
import { StudioOutro } from "./studio/StudioOutro";
import { ZoomThrough } from "./studio/transitions/ZoomThrough";
import { CubeRotation } from "./studio/transitions/CubeRotation";
import { ParallaxSlide } from "./studio/transitions/ParallaxSlide";
import { WhipPan } from "./studio/transitions/WhipPan";
import { LightLeak } from "./studio/overlays/LightLeak";
import { FilmGrain } from "./studio/overlays/FilmGrain";
import { CinematicBars } from "./studio/overlays/CinematicBars";
import { ParticleField } from "./studio/overlays/ParticleField";
import {
  INTRO_FRAMES,
  ROOM_FRAMES,
  TRANSITION_FRAMES,
  OUTRO_FRAMES,
  getRoomStart,
  getTransitionStart,
  getOutroStart,
} from "./studio/utils/timeline";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const transitions = [ZoomThrough, CubeRotation, ParallaxSlide, WhipPan];

export const StudioMontage: React.FC<StudioMontageProps> = ({
  propertyInfo,
  rooms,
  musicUrl,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const outroStart = getOutroStart(rooms.length);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ─── Intro ─── */}
      <Sequence from={0} durationInFrames={INTRO_FRAMES} layout="none">
        <StudioIntro
          propertyInfo={propertyInfo}
          firstRoomImageUrl={rooms[0].stagedPhotoUrl}
        />
      </Sequence>

      {/* ─── Room Segments ─── */}
      {rooms.map((room, i) => {
        const roomStart = getRoomStart(i);
        return (
          <Sequence
            key={`room-${i}`}
            from={roomStart}
            durationInFrames={ROOM_FRAMES}
            layout="none"
          >
            <StudioRoomSegment room={room} index={i} />
          </Sequence>
        );
      })}

      {/* ─── Transitions between rooms ─── */}
      {rooms.slice(0, -1).map((room, i) => {
        const transStart = getTransitionStart(i);
        const TransitionComponent = transitions[i % transitions.length];
        return (
          <Sequence
            key={`trans-${i}`}
            from={transStart}
            durationInFrames={TRANSITION_FRAMES}
            layout="none"
          >
            <TransitionComponent
              fromImageUrl={room.stagedPhotoUrl}
              toImageUrl={rooms[i + 1].beforePhotoUrl}
            />
          </Sequence>
        );
      })}

      {/* ─── Outro ─── */}
      <Sequence
        from={outroStart}
        durationInFrames={OUTRO_FRAMES}
        layout="none"
      >
        <StudioOutro
          agencyName={propertyInfo.agencyName}
          agencyLogoUrl={propertyInfo.agencyLogoUrl}
        />
      </Sequence>

      {/* ─── Global Overlays ─── */}
      <LightLeak />
      <FilmGrain />
      <CinematicBars introEnd={INTRO_FRAMES} outroStart={outroStart} />
      <ParticleField introEnd={INTRO_FRAMES} outroStart={outroStart} />

      {/* ─── Audio ─── */}
      {musicUrl && (
        <Audio
          src={musicUrl}
          volume={(f) => {
            // Fade in over first 30 frames
            const fadeIn = interpolate(f, [0, 30], [0, 1], CLAMP);
            // Fade out over last 30 frames
            const fadeOut = interpolate(
              f,
              [durationInFrames - 30, durationInFrames],
              [1, 0],
              CLAMP,
            );
            return Math.min(fadeIn, fadeOut);
          }}
        />
      )}
    </AbsoluteFill>
  );
};
