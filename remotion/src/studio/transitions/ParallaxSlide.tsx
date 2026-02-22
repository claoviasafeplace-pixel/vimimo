import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

const COVER: React.CSSProperties = {
	width: "100%",
	height: "100%",
	objectFit: "cover" as const,
};

interface ParallaxSlideProps {
	fromImageUrl: string;
	toImageUrl: string;
}

export const ParallaxSlide: React.FC<ParallaxSlideProps> = ({
	fromImageUrl,
	toImageUrl,
}) => {
	const frame = useCurrentFrame();

	// Outgoing: slides left faster (leading) — overshoots slightly
	const outTranslateX = interpolate(frame, [0, 35], [0, -100], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Incoming: slides from right slower (trailing) — arrives slightly later
	const inTranslateX = interpolate(frame, [5, 40], [100, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Midpoint blur: frames [15-25] peak at 4px
	const blurAmount = interpolate(frame, [12, 18, 22, 28], [0, 4, 4, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	const blurFilter = `blur(${blurAmount}px)`;

	return (
		<AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
			{/* Outgoing image — faster slide left */}
			<AbsoluteFill
				style={{
					transform: `translateX(${outTranslateX}%) scale(1.1)`,
					filter: blurFilter,
				}}
			>
				<Img src={fromImageUrl} style={COVER} />
			</AbsoluteFill>

			{/* Incoming image — slower slide from right */}
			<AbsoluteFill
				style={{
					transform: `translateX(${inTranslateX}%) scale(1.1)`,
					filter: blurFilter,
				}}
			>
				<Img src={toImageUrl} style={COVER} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
