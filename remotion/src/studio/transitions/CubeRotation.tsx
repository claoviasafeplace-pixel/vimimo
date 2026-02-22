import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

const COVER: React.CSSProperties = {
	width: "100%",
	height: "100%",
	objectFit: "cover" as const,
};

const FACE: React.CSSProperties = {
	position: "absolute",
	top: 0,
	left: 0,
	width: "100%",
	height: "100%",
	backfaceVisibility: "hidden",
};

interface CubeRotationProps {
	fromImageUrl: string;
	toImageUrl: string;
}

export const CubeRotation: React.FC<CubeRotationProps> = ({
	fromImageUrl,
	toImageUrl,
}) => {
	const frame = useCurrentFrame();

	// Rotation angle: 0 → -90 degrees over [0-40]
	const angle = interpolate(frame, [0, 40], [0, -90], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Half of 1920px width for translateZ
	const tz = 960;

	return (
		<AbsoluteFill
			style={{
				perspective: 1200,
				backgroundColor: "#000",
			}}
		>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					transformStyle: "preserve-3d",
				}}
			>
				{/* Outgoing face: rotateY(0 → -90deg) */}
				<div
					style={{
						...FACE,
						transform: `translateZ(${tz}px) rotateY(${angle}deg)`,
					}}
				>
					<Img src={fromImageUrl} style={COVER} />
				</div>

				{/* Incoming face: rotateY(90 → 0deg) */}
				<div
					style={{
						...FACE,
						transform: `rotateY(${angle + 90}deg) translateZ(${tz}px)`,
					}}
				>
					<Img src={toImageUrl} style={COVER} />
				</div>
			</div>
		</AbsoluteFill>
	);
};
