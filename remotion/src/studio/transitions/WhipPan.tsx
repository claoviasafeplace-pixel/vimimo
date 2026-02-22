import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

const COVER: React.CSSProperties = {
	width: "100%",
	height: "100%",
	objectFit: "cover" as const,
};

interface WhipPanProps {
	fromImageUrl: string;
	toImageUrl: string;
}

export const WhipPan: React.FC<WhipPanProps> = ({
	fromImageUrl,
	toImageUrl,
}) => {
	const frame = useCurrentFrame();

	// Container translateX: 0% → -50% with easeInOut feel
	// Using multi-point interpolation to simulate cubic ease-in-out
	const panX = interpolate(
		frame,
		[0, 8, 20, 32, 40],
		[0, -3, -25, -47, -50],
		{
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		},
	);

	// Motion blur: peaks at midpoint (frame 20), tapers at edges
	const blurAmount = interpolate(
		frame,
		[0, 12, 20, 28, 40],
		[0, 20, 20, 20, 0],
		{
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		},
	);

	// Horizontal stretch for motion blur effect: peaks at midpoint
	const scaleX = interpolate(
		frame,
		[0, 12, 20, 28, 40],
		[1, 1.3, 1.3, 1.3, 1],
		{
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		},
	);

	return (
		<AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "200%",
					height: "100%",
					display: "flex",
					transform: `translateX(${panX}%) scaleX(${scaleX})`,
					filter: `blur(${blurAmount}px)`,
				}}
			>
				{/* Outgoing image on left */}
				<div style={{ width: "50%", height: "100%", flexShrink: 0 }}>
					<Img src={fromImageUrl} style={COVER} />
				</div>

				{/* Incoming image on right */}
				<div style={{ width: "50%", height: "100%", flexShrink: 0 }}>
					<Img src={toImageUrl} style={COVER} />
				</div>
			</div>
		</AbsoluteFill>
	);
};
