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

interface StudioIntroProps {
	propertyInfo: {
		title: string;
		city?: string;
		neighborhood?: string;
		price?: string;
		surface?: string;
		rooms?: string;
		highlights?: string[];
	};
	firstRoomImageUrl: string;
}

export const StudioIntro: React.FC<StudioIntroProps> = ({
	propertyInfo,
	firstRoomImageUrl,
}) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	const { title, city, neighborhood, price, surface, rooms, highlights } =
		propertyInfo;

	// --- [0-30] Background gradient: navy → black ---
	const gradientOpacity = interpolate(frame, [0, 30], [1, 0], CLAMP);

	// --- [15-60] Title 3D text reveal ---
	const words = title.split(" ");
	const titleFontSize = title.length > 30 ? 52 : 68;

	// --- [40-80] Info badges ---
	const infoBadges = [city, neighborhood, price, surface, rooms].filter(
		(v): v is string => Boolean(v),
	);

	// --- [60-100] Highlight pills ---
	const highlightList = highlights ?? [];

	// --- [80-120] Blurred room preview ---
	const roomOpacity = interpolate(frame, [80, 120], [0, 0.3], CLAMP);

	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#0a0a0a",
			}}
		>
			{/* 1. Background gradient overlay (navy → transparent) */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					background: "#0a0a2e",
					opacity: gradientOpacity,
					zIndex: 0,
				}}
			/>

			{/* 2. Blurred room preview (behind content) */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					overflow: "hidden",
					zIndex: 1,
					opacity: roomOpacity,
				}}
			>
				<Img
					src={firstRoomImageUrl}
					style={{
						width: "100%",
						height: "100%",
						objectFit: "cover",
						filter: "blur(20px)",
						transform: "scale(1.1)",
					}}
				/>
			</div>

			{/* 3. Content container */}
			<AbsoluteFill
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					gap: 20,
					zIndex: 2,
				}}
			>
				{/* Title — 3D word-by-word spring reveal */}
				<div
					style={{
						perspective: "1200px",
						display: "flex",
						flexWrap: "wrap",
						justifyContent: "center",
						alignItems: "center",
						padding: "0 80px",
					}}
				>
					{words.map((word, i) => {
						const wordDelay = 15 + i * 6;

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

						return (
							<span
								key={i}
								style={{
									display: "inline-block",
									marginRight: 16,
									fontSize: titleFontSize,
									fontFamily: "sans-serif",
									fontWeight: 700,
									color: "#fff",
									letterSpacing: "-0.02em",
									textAlign: "center",
									opacity: progress,
									transform: `rotateX(${rotateX}deg) translateZ(${translateZ}px)`,
								}}
							>
								{word}
							</span>
						);
					})}
				</div>

				{/* Info badges */}
				{infoBadges.length > 0 && (
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							flexWrap: "wrap",
							justifyContent: "center",
							alignItems: "center",
							gap: 12,
						}}
					>
						{infoBadges.map((badge, i) => {
							const badgeDelay = 40 + i * 5;
							const badgeOpacity = interpolate(
								frame,
								[badgeDelay, badgeDelay + 15],
								[0, 1],
								CLAMP,
							);
							const badgeY = interpolate(
								frame,
								[badgeDelay, badgeDelay + 15],
								[20, 0],
								CLAMP,
							);

							return (
								<div
									key={i}
									style={{
										background: "rgba(255,255,255,0.08)",
										border: "1px solid rgba(255,255,255,0.15)",
										borderRadius: 20,
										padding: "8px 20px",
										fontSize: 20,
										fontFamily: "sans-serif",
										fontWeight: 500,
										color: "rgba(255,255,255,0.7)",
										opacity: badgeOpacity,
										transform: `translateY(${badgeY}px)`,
									}}
								>
									{badge}
								</div>
							);
						})}
					</div>
				)}

				{/* Highlight pills */}
				{highlightList.length > 0 && (
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							flexWrap: "wrap",
							justifyContent: "center",
							alignItems: "center",
							gap: 12,
							marginTop: 4,
						}}
					>
						{highlightList.map((highlight, i) => {
							const hlDelay = 60 + i * 5;
							const hlOpacity = interpolate(
								frame,
								[hlDelay, hlDelay + 15],
								[0, 1],
								CLAMP,
							);
							const hlY = interpolate(
								frame,
								[hlDelay, hlDelay + 15],
								[20, 0],
								CLAMP,
							);

							return (
								<div
									key={i}
									style={{
										background:
											"linear-gradient(135deg, rgba(200,164,90,0.3), rgba(200,164,90,0.15))",
										border: "1px solid rgba(200,164,90,0.4)",
										color: "#e8d48b",
										borderRadius: 16,
										padding: "6px 16px",
										fontSize: 16,
										fontFamily: "sans-serif",
										fontWeight: 500,
										opacity: hlOpacity,
										transform: `translateY(${hlY}px)`,
									}}
								>
									{highlight}
								</div>
							);
						})}
					</div>
				)}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
