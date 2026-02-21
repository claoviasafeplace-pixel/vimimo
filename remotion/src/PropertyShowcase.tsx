import React from "react";
import {
  AbsoluteFill,
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

export const PropertyShowcase: React.FC<PropertyShowcaseProps> = ({
  property,
  rooms,
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

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill
        style={{
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
