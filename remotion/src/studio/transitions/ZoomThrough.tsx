import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

const COVER: React.CSSProperties = {
	width: "100%",
	height: "100%",
	objectFit: "cover" as const,
};

interface ZoomThroughProps {
	fromImageUrl: string;
	toImageUrl: string;
}

export const ZoomThrough: React.FC<ZoomThroughProps> = ({
	fromImageUrl,
	toImageUrl,
}) => {
	const frame = useCurrentFrame();

	// Outgoing image: scale 1→8, opacity 1→0 over [0-20]
	const outScale = interpolate(frame, [0, 20], [1, 8], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	const outOpacity = interpolate(frame, [0, 20], [1, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// White flash: peaks at frame 20, ramps 0→0.6→0 over [18-22]
	const flashOpacity = interpolate(frame, [14, 18, 22, 26], [0, 0.6, 0.6, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Incoming image: scale 8→1, opacity 0→1 over [18-40]
	const inScale = interpolate(frame, [18, 40], [8, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	const inOpacity = interpolate(frame, [18, 40], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	return (
		<AbsoluteFill style={{ backgroundColor: "#000" }}>
			{/* Incoming image (behind) */}
			<AbsoluteFill
				style={{
					transform: `scale(${inScale})`,
					opacity: inOpacity,
				}}
			>
				<Img src={toImageUrl} style={COVER} />
			</AbsoluteFill>

			{/* White flash */}
			<AbsoluteFill
				style={{
					backgroundColor: "#fff",
					opacity: flashOpacity,
				}}
			/>

			{/* Outgoing image (on top) */}
			<AbsoluteFill
				style={{
					transform: `scale(${outScale})`,
					opacity: outOpacity,
				}}
			>
				<Img src={fromImageUrl} style={COVER} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
