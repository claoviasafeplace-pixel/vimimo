import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

const grainSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#g)" opacity="1"/></svg>')}`;

export const FilmGrain: React.FC = () => {
	const frame = useCurrentFrame();

	return (
		<AbsoluteFill
			style={{
				pointerEvents: "none",
				mixBlendMode: "overlay",
				opacity: 0.04,
				backgroundImage: `url("${grainSvg}")`,
				backgroundRepeat: "repeat",
				backgroundPosition: `${frame % 100}px ${(frame * 3) % 100}px`,
			}}
		/>
	);
};
