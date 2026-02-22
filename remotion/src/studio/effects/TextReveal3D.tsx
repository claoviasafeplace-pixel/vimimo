import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const TextReveal3D: React.FC<{
	text: string;
	fontSize?: number;
	color?: string;
	delay?: number;
	stagger?: number;
}> = ({
	text,
	fontSize = 72,
	color = "#fff",
	delay = 0,
	stagger = 6,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const words = text.split(" ");

	return (
		<AbsoluteFill
			style={{
				perspective: "1200px",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				{words.map((word, i) => {
					const wordDelay = delay + i * stagger;

					const progress = spring({
						frame: frame - wordDelay,
						fps,
						config: {
							damping: 14,
							stiffness: 120,
							mass: 0.8,
						},
					});

					const rotateX = 15 * (1 - progress);
					const translateZ = -200 * (1 - progress);
					const opacity = progress;

					return (
						<span
							key={i}
							style={{
								display: "inline-block",
								marginRight: 20,
								fontSize,
								color,
								fontFamily: "sans-serif",
								fontWeight: 700,
								opacity,
								transform: `rotateX(${rotateX}deg) translateZ(${translateZ}px)`,
							}}
						>
							{word}
						</span>
					);
				})}
			</div>
		</AbsoluteFill>
	);
};
