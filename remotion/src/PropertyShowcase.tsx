import React, { useCallback } from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { PropertyShowcaseProps } from "./schemas";
import { CinematicOverlay } from "./components/CinematicOverlay";
import { IntroCard } from "./components/IntroCard";
import { OutroCard } from "./components/OutroCard";
import { RoomSegment } from "./components/RoomSegment";

const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const INTRO_DUR = 90;
const ROOM_DUR = 210;
const CROSSFADE = 20;
const OUTRO_DUR = 90;

export const calculateDuration = (roomCount: number): number => {
  return INTRO_DUR + roomCount * ROOM_DUR - (roomCount - 1) * CROSSFADE + OUTRO_DUR;
};

const AUDIO_FADE_IN = 30; // 1 second fade-in
const AUDIO_FADE_OUT = 60; // 2 seconds fade-out

export const PropertyShowcase: React.FC<PropertyShowcaseProps> = ({
  property,
  rooms,
  musicUrl,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Global subtle zoom
  const globalScale = interpolate(
    frame,
    [0, durationInFrames],
    [1.0, 1.02],
    CLAMP,
  );

  // Global fade-from-black at start (15 frames = 0.5s)
  const globalFadeIn = interpolate(frame, [0, 15], [0, 1], CLAMP);

  // Global fade-to-black at end (20 frames)
  const globalFadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    CLAMP,
  );

  // Audio volume: fade-in at start, fade-out at end
  const audioVolume = useCallback(
    (f: number) => {
      const fadeIn = interpolate(f, [0, AUDIO_FADE_IN], [0, 1], CLAMP);
      const fadeOut = interpolate(
        f,
        [durationInFrames - AUDIO_FADE_OUT, durationInFrames],
        [1, 0],
        CLAMP,
      );
      return fadeIn * fadeOut * 0.8; // 80% max volume
    },
    [durationInFrames],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Background music with fade-in/fade-out */}
      {musicUrl && <Audio src={musicUrl} volume={audioVolume} />}

      <AbsoluteFill
        style={{
          opacity: globalFadeIn * globalFadeOut,
          transform: `scale(${globalScale.toFixed(4)})`,
          transformOrigin: "center center",
        }}
      >
        {/* Intro Card */}
        <Sequence from={0} durationInFrames={INTRO_DUR} layout="none">
          <IntroCard title={property.title} address={property.address} price={property.price} />
        </Sequence>

        {/* Room Segments with crossfade overlap */}
        {rooms.map((room, i) => {
          const roomStart = INTRO_DUR + i * (ROOM_DUR - CROSSFADE);

          // Fade in (except first room which follows intro)
          const fadeIn =
            i === 0
              ? 1
              : interpolate(
                  frame,
                  [roomStart, roomStart + CROSSFADE],
                  [0, 1],
                  CLAMP,
                );

          // Fade out (except last room which precedes outro)
          const nextRoomStart =
            i < rooms.length - 1
              ? INTRO_DUR + (i + 1) * (ROOM_DUR - CROSSFADE)
              : null;

          const fadeOut = nextRoomStart
            ? interpolate(
                frame,
                [nextRoomStart, nextRoomStart + CROSSFADE],
                [1, 0],
                CLAMP,
              )
            : 1;

          const opacity = Math.min(fadeIn, fadeOut);

          return (
            <Sequence
              key={`room-${i}`}
              from={roomStart}
              durationInFrames={ROOM_DUR}
              layout="none"
            >
              <AbsoluteFill style={{ opacity }}>
                <RoomSegment room={room} />
              </AbsoluteFill>
            </Sequence>
          );
        })}

        {/* Outro Card */}
        <Sequence
          from={INTRO_DUR + rooms.length * (ROOM_DUR - CROSSFADE)}
          durationInFrames={OUTRO_DUR}
          layout="none"
        >
          <OutroCard />
        </Sequence>
      </AbsoluteFill>

      {/* Cinematic overlay on top */}
      <CinematicOverlay />
    </AbsoluteFill>
  );
};
