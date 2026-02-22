import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const CinematicBars: React.FC<{
	introEnd?: number;
	outroStart?: number;
}> = ({ introEnd = 120, outroStart: outroStartProp }) => {
	const frame = useCurrentFrame();
	const { durationInFrames } = useVideoConfig();

	const outroStart = outroStartProp ?? durationInFrames - 90;

	let barHeight: number;

	if (frame <= introEnd) {
		barHeight = interpolate(frame, [0, introEnd], [12, 5.5], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		});
	} else if (frame >= outroStart) {
		barHeight = interpolate(frame, [outroStart, durationInFrames], [5.5, 12], {
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		});
	} else {
		barHeight = 5.5;
	}

	return (
		<AbsoluteFill style={{ pointerEvents: "none" }}>
			{/* Top bar */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					height: `${barHeight}%`,
					background: "#000",
				}}
			/>
			{/* Bottom bar */}
			<div
				style={{
					position: "absolute",
					bottom: 0,
					left: 0,
					right: 0,
					height: `${barHeight}%`,
					background: "#000",
				}}
			/>
		</AbsoluteFill>
	);
};
