import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {C, FONT, MONO} from '../theme';
import brands from '../brands.json';
import {
	CTAButton,
	E,
	ICON,
	Icon,
	lerp,
	LumailTile,
	Rise,
	sp,
	tw,
	useT,
	Wordmark,
	Words,
} from '../lib';

type Brand = {name: string; bg: string; fg: string; viewBox: string; svg: string};
const BRANDS = brands as Brand[];

const BrandGlyph: React.FC<{b: Brand; size: number}> = ({b, size}) => (
	<div
		style={{
			width: size,
			height: size,
			borderRadius: size * 0.25,
			background: b.bg,
			display: 'grid',
			placeItems: 'center',
			flexShrink: 0,
			boxShadow: '0 1px 0 rgba(255,255,255,0.3) inset',
		}}
	>
		<svg
			width={size * 0.58}
			height={size * 0.58}
			viewBox={b.viewBox}
			fill={b.fg}
			style={{display: 'block', color: b.fg}}
			dangerouslySetInnerHTML={{__html: b.svg}}
		/>
	</div>
);

const SLOT_ORDER = [0, 1, 2, 4, 5, 6, 7, 3, 0];

const TILE = 150;
const WORD = (TILE * 16) / 22;
const GAP = (TILE * 26) / 91;
const WORD_W = 361 * (TILE / 168);
const LOCK_L = 960 - (TILE + GAP + WORD_W) / 2;
const LOCK_Y = 372;

export const Outro: React.FC = () => {
	const t = useT();
	const enter = tw(t, 0, 0.5, E.out);
	const headOut = tw(t, 2.1, 2.45, E.inOut);

	const slotStart = 0.55;
	const slotStep = 0.21;
	const slotF = Math.max(0, (t - slotStart) / slotStep);
	const slotI = Math.min(SLOT_ORDER.length - 1, Math.floor(slotF));
	const slotP = slotI >= SLOT_ORDER.length - 1 ? 1 : tw(slotF - slotI, 0, 0.55, E.out);

	const tilePop = sp(t, 2.72, {damping: 11, stiffness: 150, mass: 0.8});
	const lock = tw(t, 3.3, 4.0, E.inOut);
	const word = tw(t, 3.5, 4.2, E.out);
	const cta = sp(t, 4.35, {damping: 14, stiffness: 150, mass: 0.8});
	const small = tw(t, 4.7, 5.1);

	const tileCx = lerp(lock, 960, LOCK_L + TILE / 2);
	const tileCy = lerp(lock, 540, LOCK_Y);
	const tileSize = lerp(lock, 210, TILE);

	return (
		<AbsoluteFill
			style={{
				fontFamily: FONT,
				opacity: enter,
				transform: `scale(${lerp(enter, 1.06, 1)})`,
			}}
		>
			{BRANDS.map((b, i) => {
				const n = BRANDS.length;
				const fly = sp(t, 0.25 + i * 0.06, {damping: 16, stiffness: 110, mass: 0.9});
				const suck = tw(t, 2.2 + i * 0.025, 2.78 + i * 0.025, E.in);
				const a = (i / n) * Math.PI * 2 + t * 0.35 + suck * 2.4;
				const rx = 740 * (1 - suck);
				const ry = 360 * (1 - suck);
				const startR = 1500;
				const x = 960 + Math.cos(a) * lerp(fly, startR, rx);
				const y = 540 + Math.sin(a) * lerp(fly, startR * 0.6, ry) + Math.sin(t * 2 + i) * 8 * (1 - suck);
				const size = 92;
				if (suck >= 1) return null;
				return (
					<div
						key={b.name}
						style={{
							position: 'absolute',
							left: x - size / 2,
							top: y - size / 2,
							transform: `scale(${lerp(suck, 1, 0.2)}) rotate(${Math.sin(t * 1.5 + i) * 6 + suck * 180}deg)`,
							filter: 'drop-shadow(0 14px 22px rgba(26,22,20,0.22))',
							opacity: 1 - tw(suck, 0.8, 1),
						}}
					>
						<BrandGlyph b={b} size={size} />
					</div>
				);
			})}

			<div
				style={{
					position: 'absolute',
					left: 0,
					width: 1920,
					top: 330,
					textAlign: 'center',
					fontSize: 96,
					fontWeight: 500,
					letterSpacing: '-0.04em',
					lineHeight: 1.12,
					color: C.ink,
					opacity: 1 - headOut,
					transform: `scale(${lerp(headOut, 1, 0.92)})`,
					filter: headOut > 0 ? `blur(${headOut * 12}px)` : undefined,
				}}
			>
				<div>
					<Words text="Migrate from" t={t} start={0.2} />
				</div>
				<div style={{position: 'relative', height: 150, margin: '-10px 0 -10px', overflow: 'hidden'}}>
					{[slotI - 1, slotI].map((si, k) => {
						if (si < 0 || t < slotStart - 0.1) return null;
						const b = BRANDS[SLOT_ORDER[si]];
						const isIn = k === 1;
						const p = isIn ? slotP : 1 - slotP;
						if (!isIn && slotP >= 1) return null;
						const y = isIn ? (1 - slotP) * 140 : -slotP * 140;
						const first = sp(t, slotStart - 0.1, {damping: 13, stiffness: 180, mass: 0.7});
						return (
							<div
								key={si}
								style={{
									position: 'absolute',
									left: 0,
									right: 0,
									top: 14,
									display: 'flex',
									justifyContent: 'center',
									transform: `translateY(${y}px) scale(${si === 0 && isIn ? first : 1})`,
									opacity: p,
								}}
							>
								<span
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										gap: '0.22em',
										padding: '0.04em 0.26em 0.04em 0.14em',
										borderRadius: '0.26em',
										border: `1.5px solid ${C.border}`,
										background: C.card,
										boxShadow: '0 1px 2px rgba(26,22,20,0.05), 0 10px 26px -12px rgba(26,22,20,0.25)',
										color: C.ink,
										lineHeight: 1.12,
									}}
								>
									<BrandGlyph b={b} size={78} />
									{b.name}
								</span>
							</div>
						);
					})}
				</div>
				<div>
					<Words text="in less than" t={t} start={0.45} />{' '}
					<Rise t={t} start={0.6} style={{color: C.flare}}>
						10 minutes
					</Rise>
				</div>
			</div>

			{[0, 1, 2].map((i) => {
				const d = 2.74 + i * 0.12;
				const p = tw(t, d, d + 1.1, E.out);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: 960 - 105,
							top: 540 - 105,
							width: 210,
							height: 210,
							borderRadius: '24%',
							border: `${3 - i * 0.7}px solid ${C.flare}`,
							transform: `scale(${lerp(p, 0.9, 2.6 + i * 0.4)})`,
							opacity: t < d ? 0 : (1 - p) * 0.5,
						}}
					/>
				);
			})}
			{new Array(16).fill(0).map((_, i) => {
				const a = (i / 16) * Math.PI * 2 + random(`oa${i}`) * 0.3;
				const dist = 220 + random(`od${i}`) * 260;
				const p = tw(t, 2.76, 3.8 + random(`ot${i}`) * 0.3, E.out);
				const s = 8 + random(`os${i}`) * 14;
				const o = t < 2.76 ? 0 : Math.min(1, p * 6) * (1 - tw(t, 3.3, 3.9));
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: 960 + Math.cos(a) * dist * p - s / 2,
							top: 540 + Math.sin(a) * dist * p - s / 2,
							opacity: o,
							transform: `rotate(${p * 200}deg)`,
						}}
					>
						{i % 2 ? (
							<Icon d={ICON.sparkle} size={s * 1.6} color={i % 4 === 1 ? C.flare : C.coral} />
						) : (
							<div style={{width: s * 0.7, height: s * 0.7, borderRadius: 99, background: i % 4 === 0 ? C.ink : C.flare}} />
						)}
					</div>
				);
			})}

			{t > 2.7 ? (
				<>
					{t > 4.6
						? [0, 1].map((i) => {
								const cyc = ((t - 4.6 + i * 1.0) % 2.0) / 2.0;
								return (
									<div
										key={`amb${i}`}
										style={{
											position: 'absolute',
											left: tileCx - TILE / 2,
											top: tileCy - TILE / 2,
											width: TILE,
											height: TILE,
											borderRadius: '24%',
											border: `1.5px solid ${C.flare}`,
											transform: `scale(${lerp(E.out(cyc), 1.05, 2.4)})`,
											opacity: Math.sin(Math.min(1, cyc * 1.4) * Math.PI) * 0.18,
										}}
									/>
								);
							})
						: null}
					<div
						style={{
							position: 'absolute',
							left: tileCx - tileSize / 2,
							top: tileCy - tileSize / 2,
							transform: `scale(${tilePop}) rotate(${(1 - tilePop) * -30}deg)`,
							filter: 'drop-shadow(0 24px 40px rgba(255,51,0,0.3))',
						}}
					>
						<LumailTile size={tileSize} />
					</div>
				</>
			) : null}

			<div
				style={{
					position: 'absolute',
					left: LOCK_L + TILE + GAP,
					top: LOCK_Y - WORD * 0.54,
					clipPath: `inset(-20% ${(1 - word) * 100}% -20% 0)`,
					transform: `translateX(${(1 - word) * -60}px)`,
				}}
			>
				<Wordmark size={WORD} />
			</div>

			<div
				style={{
					position: 'absolute',
					left: 0,
					width: 1920,
					top: 505,
					textAlign: 'center',
					fontSize: 58,
					fontWeight: 500,
					letterSpacing: '-0.035em',
					color: C.ink,
				}}
			>
				{t > 3.6 ? (
					<>
						<Words text="The AI tool that will make you love" t={t} start={3.7} stagger={0.04} />{' '}
						<Words text="email marketing." t={t} start={4.0} stagger={0.05} color={C.flare} />
					</>
				) : null}
			</div>

			<div
				style={{
					position: 'absolute',
					left: 0,
					width: 1920,
					top: 640,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					gap: 40,
					opacity: Math.min(1, cta * 1.5),
					transform: `translateY(${(1 - cta) * 50}px)`,
				}}
			>
				<CTAButton label="Start free" fontSize={34} press={tw(t, 5.6, 5.68) * (1 - tw(t, 5.7, 5.9))} />
				<div style={{fontFamily: MONO, fontSize: 34, color: C.ink, position: 'relative'}}>
					lumail.io
					<div
						style={{
							position: 'absolute',
							left: 0,
							bottom: -6,
							height: 3,
							width: `${tw(t, 4.6, 5.1, E.inOut) * 100}%`,
							background: C.flare,
							borderRadius: 3,
						}}
					/>
				</div>
			</div>
			<div
				style={{
					position: 'absolute',
					left: 0,
					width: 1920,
					top: 770,
					textAlign: 'center',
					fontSize: 24,
					color: C.muted,
					opacity: small,
					transform: `translateY(${(1 - small) * 14}px)`,
				}}
			>
				3,000 emails/month free · no card · unlimited subscribers
			</div>
			<div
				style={{
					position: 'absolute',
					left: 0,
					width: 1920,
					top: 868,
					textAlign: 'center',
					fontFamily: MONO,
					fontSize: 19,
					letterSpacing: '0.2em',
					color: C.muted,
					opacity: tw(t, 5.0, 5.5),
				}}
			>
				RUNS INSIDE&nbsp;&nbsp;CHATGPT · CLAUDE · CURSOR · CODEX · HERMES · OPENCLAW
			</div>
		</AbsoluteFill>
	);
};
