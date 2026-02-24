import React from "react";
import {
	AbsoluteFill,
	Img,
	interpolate,
	useCurrentFrame,
	spring,
	useVideoConfig,
} from "remotion";

const CLAMP = {
	extrapolateLeft: "clamp",
	extrapolateRight: "clamp",
} as const;

interface StudioOutroProps {
	agencyName?: string;
	agencyLogoUrl?: string;
	watermarkType?: "vimimo" | "custom" | "none";
}

const VIMIMO_LETTERS = "VIMIMO".split("");

export const StudioOutro: React.FC<StudioOutroProps> = ({
	agencyName,
	agencyLogoUrl,
	watermarkType = "vimimo",
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// --- [0-30] Fade to black ---
	const fadeToBlack = interpolate(frame, [0, 30], [0, 1], CLAMP);

	// --- [40-70] Subtitle slide up ---
	const subtitleOpacity = interpolate(frame, [40, 60], [0, 1], CLAMP);
	const subtitleY = interpolate(frame, [40, 60], [20, 0], CLAMP);

	// --- [45-75] Golden separator line width ---
	const separatorWidth = interpolate(frame, [45, 70], [0, 200], CLAMP);

	// --- [50-90] Agency credit ---
	const agencyOpacity = interpolate(frame, [55, 70], [0, 1], CLAMP);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#000",
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			{/* Fade to black overlay */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					backgroundColor: "#000",
					opacity: fadeToBlack,
					zIndex: 0,
				}}
			/>

			{/* Content container */}
			<AbsoluteFill
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					zIndex: 1,
				}}
			>
				{/* Custom agency logo (marque blanche) */}
				{watermarkType === "custom" && agencyLogoUrl && (
					<Img
						src={agencyLogoUrl}
						style={{
							maxHeight: 120,
							maxWidth: 400,
							opacity: interpolate(frame, [15, 35], [0, 1], CLAMP),
							transform: `scale(${interpolate(frame, [15, 35], [0.9, 1], CLAMP).toFixed(4)})`,
						}}
					/>
				)}

				{/* Custom agency name without logo */}
				{watermarkType === "custom" && !agencyLogoUrl && agencyName && (
					<div
						style={{
							color: "#fff",
							fontSize: 72,
							fontFamily: "sans-serif",
							fontWeight: 700,
							letterSpacing: 6,
							opacity: interpolate(frame, [15, 35], [0, 1], CLAMP),
						}}
					>
						{agencyName}
					</div>
				)}

				{/* VIMIMO branding (Starter / guest / default) */}
				{watermarkType === "vimimo" && (
					<>
						<div
							style={{
								perspective: "1200px",
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							{VIMIMO_LETTERS.map((letter, i) => {
								const letterDelay = 15 + i * 4;
								const progress = spring({
									frame: frame - letterDelay,
									fps,
									config: {
										damping: 12,
										stiffness: 100,
										mass: 0.7,
									},
								});
								const rotateY = 90 * (1 - progress);
								const translateZ = -100 * (1 - progress);
								return (
									<span
										key={i}
										style={{
											display: "inline-block",
											fontSize: 96,
											fontFamily: "sans-serif",
											fontWeight: 700,
											color: "#fff",
											letterSpacing: 12,
											opacity: progress,
											transform: `rotateY(${rotateY}deg) translateZ(${translateZ}px)`,
										}}
									>
										{letter}
									</span>
								);
							})}
						</div>

						{/* Subtitle — slide up [40-60] */}
						<div
							style={{
								color: "rgba(255,255,255,0.6)",
								fontSize: 32,
								fontFamily: "sans-serif",
								fontWeight: 400,
								letterSpacing: 4,
								opacity: subtitleOpacity,
								transform: `translateY(${subtitleY}px)`,
							}}
						>
							Virtual Staging IA
						</div>
					</>
				)}

				{/* Golden separator line [45-70] — always shown unless none */}
				{watermarkType !== "none" && (
					<div
						style={{
							width: separatorWidth,
							height: 2,
							background:
								"linear-gradient(90deg, transparent, #c8a45a, #e8d48b, #c8a45a, transparent)",
							marginTop: 20,
						}}
					/>
				)}

				{/* "Vidéo générée par VIMIMO" for Starter watermark */}
				{watermarkType === "vimimo" && (
					<div
						style={{
							color: "rgba(255,255,255,0.4)",
							fontSize: 20,
							fontFamily: "sans-serif",
							fontWeight: 400,
							marginTop: 30,
							opacity: agencyOpacity,
						}}
					>
						Vidéo générée par VIMIMO
					</div>
				)}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
