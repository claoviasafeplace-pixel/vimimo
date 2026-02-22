import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export const LightLeak: React.FC = () => {
	const frame = useCurrentFrame();

	const opacity = Math.sin((frame * Math.PI * 2) / 90) * 0.15 + 0.15;
	const translateX = Math.sin((frame * Math.PI * 2) / 150) * 30;

	return (
		<AbsoluteFill
			style={{
				pointerEvents: "none",
				mixBlendMode: "screen",
				opacity,
				transform: `translateX(${translateX}px)`,
				background:
					"radial-gradient(ellipse at 70% 30%, rgba(255,200,100,0.3), transparent 70%)",
			}}
		/>
	);
};
