import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const Parallax3D: React.FC<{
	children: React.ReactNode;
	depth?: number;
	perspective?: number;
	panX?: number;
	panY?: number;
}> = ({
	children,
	depth = -50,
	perspective = 800,
	panX = 20,
	panY = 10,
}) => {
	const frame = useCurrentFrame();
	const { durationInFrames } = useVideoConfig();

	const translateX = interpolate(frame, [0, durationInFrames], [-panX, panX], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	const translateY = interpolate(frame, [0, durationInFrames], [-panY, panY], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill
			style={{
				perspective: `${perspective}px`,
				transformStyle: "preserve-3d",
			}}
		>
			<AbsoluteFill
				style={{
					transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${depth}px)`,
				}}
			>
				{children}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
