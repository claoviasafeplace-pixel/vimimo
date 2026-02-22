import React from "react";
import {
	AbsoluteFill,
	Img,
	OffthreadVideo,
	Sequence,
	interpolate,
	useCurrentFrame,
} from "remotion";

const CLAMP = {
	extrapolateLeft: "clamp",
	extrapolateRight: "clamp",
} as const;

const COVER: React.CSSProperties = {
	width: "100%",
	height: "100%",
	objectFit: "cover" as const,
};

export interface StudioRoomSegmentProps {
	room: {
		beforePhotoUrl: string;
		stagedPhotoUrl: string;
		videoUrl: string;
		roomType: string;
		roomLabel: string;
	};
	index: number;
}

// Total: 150 frames (5s at 30fps)
// [0-35]    Before photo + parallax + Ken Burns + "AVANT" badge
// [35-65]   Diagonal reveal with depth (before slides away, staged emerges)
// [60-135]  Kling video + glass-morphism room label
// [130-150] Beauty shot staged photo + "APRES" golden badge

export const StudioRoomSegment: React.FC<StudioRoomSegmentProps> = ({
	room,
	index,
}) => {
	const frame = useCurrentFrame();

	// ─── Phase A: Before photo + Parallax [0-35] ───
	const kenBurnsScale = interpolate(frame, [0, 35], [1.0, 1.06], CLAMP);
	const kenBurnsTranslateX = interpolate(frame, [0, 35], [-15, 15], CLAMP);
	const avantOpacity = interpolate(frame, [5, 15], [0, 1], CLAMP);
	const avantRotateY = interpolate(frame, [5, 15], [5, 0], CLAMP);

	// ─── Phase B: Diagonal reveal [35-65] ───
	const revealProgress = interpolate(frame, [35, 65], [0, 1], CLAMP);
	const beforeSlideX = interpolate(frame, [35, 65], [0, -100], CLAMP);
	const beforeRotateY = interpolate(frame, [35, 65], [0, -15], CLAMP);
	const beforeTranslateZ = interpolate(frame, [35, 65], [0, -100], CLAMP);

	// Diagonal clip: polygon from full coverage to nothing
	// Top-right corner sweeps to bottom-left
	const clipLeft = interpolate(frame, [35, 65], [0, 100], CLAMP);
	const clipRight = interpolate(frame, [35, 65], [100, 200], CLAMP);

	// Glow line position tracks the wipe edge
	const glowPosition = interpolate(frame, [35, 65], [100, 0], CLAMP);

	// Light leak pulse centered at frame 50
	const lightLeakOpacity = interpolate(
		frame,
		[35, 50, 65],
		[0, 0.3, 0],
		CLAMP,
	);

	// ─── Phase C: Video [60-135] ───
	const videoZoom = interpolate(frame, [60, 135], [1.0, 1.03], CLAMP);
	const labelOpacity = interpolate(frame, [70, 85], [0, 1], CLAMP);

	// Crossfade: reveal → video [58-63]
	const revealOutOpacity = interpolate(frame, [58, 63], [1, 0], CLAMP);
	const videoInOpacity = interpolate(frame, [58, 63], [0, 1], CLAMP);

	// ─── Phase D: Beauty shot [130-150] ───
	const videoOutOpacity = interpolate(frame, [128, 135], [1, 0], CLAMP);
	const stagedInOpacity = interpolate(frame, [128, 135], [0, 1], CLAMP);
	const beautyScale = interpolate(frame, [130, 150], [1.03, 1.0], CLAMP);
	const beautyTranslateX = interpolate(frame, [130, 150], [10, -10], CLAMP);
	const apresOpacity = interpolate(frame, [135, 145], [0, 1], CLAMP);

	return (
		<AbsoluteFill style={{ backgroundColor: "#000" }}>
			{/* ── Phase A: Before photo + Parallax [0-35] ── */}
			<Sequence from={0} durationInFrames={40} layout="none">
				<AbsoluteFill
					style={{
						perspective: "800px",
						transformStyle: "preserve-3d",
					}}
				>
					<Img
						src={room.beforePhotoUrl}
						style={{
							...COVER,
							transform: `scale(${kenBurnsScale.toFixed(4)}) translateX(${kenBurnsTranslateX.toFixed(2)}px) translateZ(-50px)`,
							transformOrigin: "center center",
						}}
					/>
					{/* AVANT badge */}
					<div
						style={{
							position: "absolute",
							top: 40,
							left: 48,
							opacity: avantOpacity,
							transform: `rotateY(${avantRotateY.toFixed(2)}deg)`,
						}}
					>
						<div
							style={{
								background: "rgba(0,0,0,0.7)",
								color: "#fff",
								fontSize: 20,
								padding: "8px 20px",
								borderRadius: 20,
								letterSpacing: 2,
								fontWeight: 700,
								fontFamily: "sans-serif",
								textTransform: "uppercase",
								backdropFilter: "blur(8px)",
							}}
						>
							AVANT
						</div>
					</div>
				</AbsoluteFill>
			</Sequence>

			{/* ── Phase B: Diagonal reveal with depth [35-65] ── */}
			<Sequence from={35} durationInFrames={31} layout="none">
				<AbsoluteFill>
					{/* Staged image underneath */}
					<Img src={room.stagedPhotoUrl} style={COVER} />

					{/* Before image sliding away on 3D plane */}
					<AbsoluteFill
						style={{
							perspective: "800px",
							transformStyle: "preserve-3d",
						}}
					>
						<AbsoluteFill
							style={{
								transform: `translateX(${beforeSlideX.toFixed(2)}%) rotateY(${beforeRotateY.toFixed(2)}deg) translateZ(${beforeTranslateZ.toFixed(2)}px)`,
								clipPath: `polygon(0% 0%, ${clipRight.toFixed(1)}% 0%, ${clipLeft.toFixed(1)}% 100%, 0% 100%)`,
							}}
						>
							<Img src={room.beforePhotoUrl} style={COVER} />
						</AbsoluteFill>
					</AbsoluteFill>

					{/* Glow line at the wipe edge */}
					<div
						style={{
							position: "absolute",
							top: 0,
							left: `${glowPosition.toFixed(1)}%`,
							width: 3,
							height: "100%",
							background: "rgba(255,200,100,0.6)",
							boxShadow: "0 0 20px rgba(255,200,100,0.6)",
							transform: "skewX(-15deg)",
							pointerEvents: "none",
						}}
					/>

					{/* Light leak pulse */}
					<AbsoluteFill
						style={{
							background:
								"radial-gradient(ellipse at 50% 50%, rgba(255,200,100,0.6), transparent 70%)",
							opacity: lightLeakOpacity,
							mixBlendMode: "screen",
							pointerEvents: "none",
						}}
					/>
				</AbsoluteFill>
			</Sequence>

			{/* ── Phase C: Kling Video [58-135] ── */}
			<Sequence from={58} durationInFrames={78} layout="none">
				<AbsoluteFill
					style={{
						opacity: Math.min(videoInOpacity, videoOutOpacity),
					}}
				>
					<AbsoluteFill
						style={{
							perspective: "800px",
							transformStyle: "preserve-3d",
						}}
					>
						<OffthreadVideo
							src={room.videoUrl}
							playbackRate={1.0}
							style={{
								...COVER,
								transform: `scale(${videoZoom.toFixed(4)})`,
								transformOrigin: "center center",
							}}
						/>

						{/* Glass-morphism room label */}
						<div
							style={{
								position: "absolute",
								bottom: 48,
								left: 48,
								opacity: labelOpacity,
								transform: "translateZ(30px)",
								background: "rgba(255,255,255,0.1)",
								backdropFilter: "blur(12px)",
								border: "1px solid rgba(255,255,255,0.2)",
								borderRadius: 12,
								padding: "10px 20px",
							}}
						>
							<div
								style={{
									color: "#fff",
									fontSize: 22,
									fontWeight: 600,
									fontFamily: "sans-serif",
									lineHeight: 1.2,
								}}
							>
								{room.roomLabel}
							</div>
							<div
								style={{
									color: "rgba(255,255,255,0.5)",
									fontSize: 14,
									fontFamily: "sans-serif",
									marginTop: 2,
								}}
							>
								{room.roomType}
							</div>
						</div>
					</AbsoluteFill>
				</AbsoluteFill>
			</Sequence>

			{/* ── Phase D: Beauty shot staged photo [128-150] ── */}
			<Sequence from={128} durationInFrames={22} layout="none">
				<AbsoluteFill style={{ opacity: stagedInOpacity }}>
					<Img
						src={room.stagedPhotoUrl}
						style={{
							...COVER,
							transform: `scale(${beautyScale.toFixed(4)}) translateX(${beautyTranslateX.toFixed(2)}px)`,
							transformOrigin: "center center",
						}}
					/>
					{/* APRES golden badge */}
					<div
						style={{
							position: "absolute",
							top: 40,
							left: 48,
							opacity: apresOpacity,
						}}
					>
						<div
							style={{
								background: "rgba(255,255,255,0.9)",
								color: "#1a1a1a",
								fontSize: 20,
								padding: "8px 20px",
								borderRadius: 20,
								letterSpacing: 2,
								fontWeight: 700,
								fontFamily: "sans-serif",
								textTransform: "uppercase",
								backdropFilter: "blur(8px)",
								boxShadow:
									"0 0 12px rgba(255,200,100,0.3), inset 0 0 0 1px rgba(255,200,100,0.4)",
							}}
						>
							APRES
						</div>
					</div>
				</AbsoluteFill>
			</Sequence>
		</AbsoluteFill>
	);
};
