import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {C, HAND, MONO} from '../theme';
import {
	E,
	ICON,
	Icon,
	LumailTile,
	lerp,
	sp,
	tw,
	useT,
	Wordmark,
} from '../lib';

const TILE0 = 240;
const TILE1 = 168;
const WORD = (TILE1 * 16) / 22;
const GAP = (TILE1 * 26) / 91;
const WORD_W = 361;
const LOCK_W = TILE1 + GAP + WORD_W;
const CY = 505;
const LOCK_L = 960 - LOCK_W / 2;
const TILE_CX1 = LOCK_L + TILE1 / 2;

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#%&';

const Decode: React.FC<{text: string; t: number; start: number}> = ({
	text,
	t,
	start,
}) => (
	<>
		{text.split('').map((ch, i) => {
			const at = start + i * 0.022;
			if (ch === ' ') return <span key={i}> </span>;
			if (t >= at) return <span key={i}>{ch}</span>;
			if (t < at - 0.3) return <span key={i} style={{opacity: 0}}>{ch}</span>;
			const k = Math.floor(t * 30);
			const g = GLYPHS[Math.floor(random(`g${i}-${k}`) * GLYPHS.length)];
			return (
				<span key={i} style={{color: C.flare}}>
					{g}
				</span>
			);
		})}
	</>
);

export const Intro: React.FC = () => {
	const t = useT();

	const seed = sp(t, 0.02, {damping: 10, stiffness: 200, mass: 0.6});
	const pop = sp(t, 0.35, {damping: 11, stiffness: 140, mass: 0.8});
	const draw = tw(t, 0.6, 1.35, E.inOut);
	const lock = tw(t, 1.45, 2.25, E.inOut);
	const word = tw(t, 1.7, 2.45, E.out);

	const tileScale = t < 0.35 ? 0 : lerp(pop, 0.06, 1) * lerp(lock, 1, TILE1 / TILE0);
	const tileCx = lerp(lock, 960, TILE_CX1);
	const tileRot = (1 - pop) * -28;

	// Zoom-through into the empty top-right of the tile (no letter in the way).
	const zp = tw(t, 3.25, 4.0, (n) => n * n * n * n);
	const zoomScale = lerp(zp, 1, 48);
	const zx = TILE_CX1 + 0.2 * TILE1;
	const zy = CY - 0.13 * TILE1;
	const flat = tw(t, 3.5, 3.78, E.inOut);
	const extrasOut = 1 - tw(t, 3.1, 3.4, E.inOut);

	const rings = [0.4, 0.56, 0.72].map((d, i) => {
		const p = tw(t, d, d + 1.1, E.out);
		return (
			<div
				key={i}
				style={{
					position: 'absolute',
					left: 960 - TILE0 / 2,
					top: CY - TILE0 / 2,
					width: TILE0,
					height: TILE0,
					borderRadius: '24%',
					border: `${3 - i * 0.6}px solid ${C.flare}`,
					transform: `scale(${lerp(p, 0.9, 2.3 + i * 0.35)})`,
					opacity: t < d ? 0 : (1 - p) * 0.55,
				}}
			/>
		);
	});

	const particles = new Array(18).fill(0).map((_, i) => {
		const a = (i / 18) * Math.PI * 2 + random(`a${i}`) * 0.4;
		const dist = 230 + random(`d${i}`) * 220;
		const p = tw(t, 0.38, 1.4 + random(`t${i}`) * 0.3, E.out);
		const size = 8 + random(`s${i}`) * 16;
		const colors = [C.flare, C.coral, C.ink, C.flare, C.blush];
		const color = colors[i % colors.length];
		const x = 960 + Math.cos(a) * dist * p;
		const y = CY + Math.sin(a) * dist * p;
		const o = t < 0.38 ? 0 : Math.min(1, p * 6) * (1 - tw(t, 0.9, 1.6));
		const isSpark = i % 3 === 0;
		return (
			<div
				key={i}
				style={{
					position: 'absolute',
					left: x - size / 2,
					top: y - size / 2,
					width: size,
					height: size,
					opacity: o,
					transform: `rotate(${p * 180}deg) scale(${1 - p * 0.5})`,
				}}
			>
				{isSpark ? (
					<Icon d={ICON.sparkle} size={size * 1.6} color={color} />
				) : (
					<div
						style={{
							width: size * 0.7,
							height: size * 0.7,
							borderRadius: 99,
							background: color,
						}}
					/>
				)}
			</div>
		);
	});

	const annot = tw(t, 2.05, 2.7, E.inOut);
	const arrow = tw(t, 2.45, 2.95, E.inOut);

	return (
		<AbsoluteFill>
			{rings}
			{particles}
			<AbsoluteFill
				style={{
					transformOrigin: `${zx}px ${zy}px`,
					transform: `translate(${zp * (960 - zx)}px, ${zp * (540 - zy)}px) scale(${zoomScale})`,
				}}
			>
				{t < 0.36 ? (
					<div
						style={{
							position: 'absolute',
							left: 960 - 9,
							top: CY - 9,
							width: 18,
							height: 18,
							borderRadius: 99,
							background: C.flare,
							transform: `scale(${seed * (1 + Math.sin(t * 30) * 0.08)})`,
							boxShadow: '0 0 0 8px rgba(255,51,0,0.12)',
						}}
					/>
				) : null}
				<div
					style={{
						position: 'absolute',
						left: tileCx - TILE0 / 2,
						top: CY - TILE0 / 2,
						width: TILE0,
						height: TILE0,
						transform: `scale(${tileScale}) rotate(${tileRot}deg)`,
						filter: `drop-shadow(0 ${20 * pop}px ${40 * pop}px rgba(255,51,0,${0.28 * (1 - flat)}))`,
					}}
				>
					<LumailTile size={TILE0} draw={draw} flat={flat} />
				</div>
				<div
					style={{
						position: 'absolute',
						left: LOCK_L + TILE1 + GAP,
						top: CY - WORD * 0.54,
						clipPath: `inset(-20% ${(1 - word) * 100}% -20% 0)`,
						transform: `translateX(${(1 - word) * -60}px)`,
					}}
				>
					<Wordmark size={WORD} />
				</div>
				<div style={{opacity: extrasOut}}>
					<div
						style={{
							position: 'absolute',
							left: LOCK_L - 250,
							top: CY - 250,
							fontFamily: HAND,
							fontWeight: 500,
							fontSize: 64,
							color: C.muted,
							transform: 'rotate(-7deg)',
							clipPath: `inset(-30% ${(1 - annot) * 100}% -30% 0)`,
						}}
					>
						Introducing
					</div>
					<svg
						width={200}
						height={160}
						viewBox="0 0 200 160"
						style={{position: 'absolute', left: LOCK_L - 40, top: CY - 205}}
					>
						<path
							d="M20 20 C 90 10, 130 50, 128 112"
							fill="none"
							stroke={C.muted}
							strokeWidth={3.5}
							strokeLinecap="round"
							strokeDasharray={160}
							strokeDashoffset={160 * (1 - arrow)}
						/>
						<path
							d="M112 96 L128 116 L142 94"
							fill="none"
							stroke={C.muted}
							strokeWidth={3.5}
							strokeLinecap="round"
							strokeLinejoin="round"
							opacity={arrow > 0.92 ? 1 : 0}
						/>
					</svg>
					<div
						style={{
							position: 'absolute',
							left: 0,
							width: 1920,
							top: CY + 150,
							textAlign: 'center',
							fontFamily: MONO,
							fontSize: 25,
							letterSpacing: '0.24em',
							color: C.muted,
						}}
					>
						<Decode text="THE AI-NATIVE EMAIL PLATFORM" t={t} start={2.25} />
					</div>
				</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
