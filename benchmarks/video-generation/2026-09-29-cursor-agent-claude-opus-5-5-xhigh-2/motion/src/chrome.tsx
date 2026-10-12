import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, H, W} from './theme';
import {E, LumailTile, lerp, tw, useT, Wordmark} from './lib';

const hatch = (color: string) =>
	`url("data:image/svg+xml;utf8,${encodeURIComponent(
		`<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><path d='M-3,3 l6,-6 M0,12 l12,-12 M9,15 l6,-6' stroke='${color}' stroke-width='1.1'/></svg>`,
	)}")`;

export const COL_L = 88;
export const COL_R = W - 88;

// The lumail.io page frame: column borders + diagonal hatched rails.
export const PageFrame: React.FC<{
	scrollY: number;
	draw: number;
	color?: string;
	lineColor?: string;
}> = ({scrollY, draw, color = '#e3ddd5', lineColor = C.border}) => {
	const line = (x: number): React.CSSProperties => ({
		position: 'absolute',
		left: x,
		top: 0,
		width: 1.5,
		height: H,
		background: lineColor,
		transform: `scaleY(${draw})`,
	});
	const rail = (x: number): React.CSSProperties => ({
		position: 'absolute',
		left: x,
		top: 0,
		width: 40,
		height: H,
		backgroundImage: hatch(color),
		backgroundSize: '12px 12px',
		backgroundPosition: `0 ${-scrollY}px`,
		clipPath: `inset(${(1 - draw) * 50}% 0 ${(1 - draw) * 50}% 0)`,
	});
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div style={rail(48)} />
			<div style={rail(COL_R)} />
			<div style={line(48)} />
			<div style={line(COL_L)} />
			<div style={line(COL_R)} />
			<div style={line(COL_R + 40)} />
		</AbsoluteFill>
	);
};

const NAV_ITEMS = ['Product', 'Agents', 'Pricing', 'Docs', 'Changelog'];

// Sticky site header. `active` is a float index so the indicator can glide.
export const Nav: React.FC<{opacity: number; active: number}> = ({
	opacity,
	active,
}) => {
	const itemX = [0, 124, 244, 358, 452];
	const itemW = [108, 104, 98, 78, 130];
	const i0 = Math.floor(active);
	const i1 = Math.min(NAV_ITEMS.length - 1, i0 + 1);
	const f = active - i0;
	const x = lerp(f, itemX[i0], itemX[i1]);
	const w = lerp(f, itemW[i0], itemW[i1]);
	return (
		<div
			style={{
				position: 'absolute',
				left: COL_L + 1.5,
				top: 0,
				width: COL_R - COL_L - 1.5,
				height: 96,
				opacity,
				transform: `translateY(${(1 - opacity) * -24}px)`,
				background: 'rgba(248,247,244,0.82)',
				backdropFilter: 'blur(14px)',
				borderBottom: `1.5px solid ${C.border}`,
				display: 'flex',
				alignItems: 'center',
				padding: '0 44px',
				fontFamily: FONT,
			}}
		>
			<div style={{display: 'flex', alignItems: 'center', gap: 14}}>
				<LumailTile size={40} />
				<Wordmark size={29} />
			</div>
			<div style={{position: 'relative', marginLeft: 56, height: 44}}>
				<div
					style={{
						position: 'absolute',
						left: x,
						top: 0,
						width: w,
						height: 44,
						borderRadius: 999,
						background: C.secondary,
					}}
				/>
				{NAV_ITEMS.map((it, i) => (
					<div
						key={it}
						style={{
							position: 'absolute',
							left: itemX[i],
							width: itemW[i],
							top: 0,
							height: 44,
							display: 'grid',
							placeItems: 'center',
							fontSize: 21,
							color: Math.abs(active - i) < 0.5 ? C.ink : C.muted,
						}}
					>
						{it}
					</div>
				))}
			</div>
			<div style={{flex: 1}} />
			<div style={{fontSize: 21, color: C.muted, marginRight: 30}}>Log in</div>
			<div
				style={{
					background: C.flare,
					color: '#fff',
					fontSize: 21,
					fontWeight: 500,
					padding: '11px 24px',
					borderRadius: 999,
				}}
			>
				Sign up
			</div>
		</div>
	);
};

export const GlobalChrome: React.FC = () => {
	const t = useT();
	const scrollY = tw(t, 13, 13.5, E.inOut) * 1080;
	return (
		<PageFrame scrollY={scrollY} draw={tw(t, 0.05, 1.0, E.inOut)} />
	);
};

export const GlobalNav: React.FC = () => {
	const t = useT();
	const opacity = tw(t, 8.35, 8.9) * (1 - tw(t, 37.9, 38.3, E.inOut));
	const active =
		tw(t, 13.05, 13.5, E.inOut) * 1 -
		tw(t, 19.05, 19.5, E.inOut) * 1 +
		tw(t, 33.1, 33.6, E.inOut) * 2;
	if (opacity <= 0) return null;
	return <Nav opacity={opacity} active={active} />;
};
