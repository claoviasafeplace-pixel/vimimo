import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

const PARTICLE_COUNT = 25;

interface Particle {
	x: number;
	y: number;
	size: number;
	alpha: number;
	driftX: number;
	driftY: number;
}

const generateParticles = (): Particle[] => {
	return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
		x: ((i * 37 + 13) % 100),
		y: ((i * 53 + 7) % 100),
		size: (i % 3) * 2 + 2,
		alpha: 0.1 + (i % 4) * 0.067,
		driftX: 20 + ((i * 17) % 60),
		driftY: 20 + ((i * 31) % 60),
	}));
};

export const ParticleField: React.FC<{
	introEnd?: number;
	outroStart?: number;
}> = ({ introEnd = 120, outroStart: outroStartProp }) => {
	const frame = useCurrentFrame();
	const { durationInFrames } = useVideoConfig();
	const particles = React.useMemo(() => generateParticles(), []);

	const outroStart = outroStartProp ?? durationInFrames - 90;

	const opacity = interpolate(
		frame,
		[0, 100, introEnd, outroStart, outroStart + 20, durationInFrames],
		[0.8, 0.8, 0, 0, 0.8, 0.8],
		{
			extrapolateLeft: "clamp",
			extrapolateRight: "clamp",
		},
	);

	return (
		<AbsoluteFill style={{ pointerEvents: "none", opacity }}>
			{particles.map((p, i) => {
				const tx = interpolate(
					frame,
					[0, durationInFrames],
					[0, p.driftX * (i % 2 === 0 ? 1 : -1)],
					{
						extrapolateLeft: "clamp",
						extrapolateRight: "clamp",
					},
				);

				const ty = interpolate(
					frame,
					[0, durationInFrames],
					[0, p.driftY * (i % 2 === 0 ? -1 : 1)],
					{
						extrapolateLeft: "clamp",
						extrapolateRight: "clamp",
					},
				);

				return (
					<div
						key={i}
						style={{
							position: "absolute",
							left: `${p.x}%`,
							top: `${p.y}%`,
							width: p.size,
							height: p.size,
							borderRadius: "50%",
							backgroundColor: `rgba(255, 200, 100, ${p.alpha})`,
							transform: `translateX(${tx}px) translateY(${ty}px)`,
						}}
					/>
				);
			})}
		</AbsoluteFill>
	);
};
