import React, {useId} from 'react';
import {
	Easing,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
	SpringConfig,
} from 'remotion';
import {C, FONT, MONO, SHADOW_CHIP} from './theme';

export const useT = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	return frame / fps;
};

export const E = {
	out: Easing.bezier(0.16, 1, 0.3, 1),
	outSoft: Easing.bezier(0.22, 1, 0.36, 1),
	inOut: Easing.bezier(0.65, 0, 0.35, 1),
	in: Easing.bezier(0.7, 0, 0.84, 0),
	inSoft: Easing.bezier(0.5, 0, 0.75, 0),
};

export const tw = (
	t: number,
	a: number,
	b: number,
	easing: (n: number) => number = E.out,
) =>
	interpolate(t, [a, b], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing,
	});

export const lerp = (p: number, a: number, b: number) => a + (b - a) * p;

export const SPRING_POP: Partial<SpringConfig> = {
	damping: 12,
	stiffness: 170,
	mass: 0.7,
};
export const SPRING_SOFT: Partial<SpringConfig> = {
	damping: 20,
	stiffness: 120,
	mass: 0.9,
};

export const sp = (
	t: number,
	delay: number,
	config: Partial<SpringConfig> = SPRING_POP,
	fps = 60,
) =>
	spring({
		frame: Math.max(0, Math.round((t - delay) * fps)),
		fps,
		config,
	});

export const typed = (text: string, t: number, start: number, cps = 40) =>
	text.slice(0, Math.max(0, Math.floor((t - start) * cps)));

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

export const ICON = {
	sparkle:
		'M208,144a15.78,15.78,0,0,1-10.42,14.94L146,178l-19,51.62a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88L78,110l19-51.62a15.92,15.92,0,0,1,29.88,0L146,110l51.62,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z',
	envelopeFill:
		'M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-8,144H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z',
	envelope:
		'M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48Zm-96,85.15L52.57,64H203.43ZM98.71,128,40,181.81V74.19Zm11.84,10.85,12,11.05a8,8,0,0,0,10.82,0l12-11.05,58,53.15H52.57ZM157.29,128,216,74.18V181.82Z',
	tag: 'M243.31,136,144,36.69A15.86,15.86,0,0,0,132.69,32H40a8,8,0,0,0-8,8v92.69A15.86,15.86,0,0,0,36.69,144L136,243.31a16,16,0,0,0,22.63,0l84.68-84.68a16,16,0,0,0,0-22.63Zm-96,96L48,132.69V48h84.69L232,147.31ZM96,84A12,12,0,1,1,84,72,12,12,0,0,1,96,84Z',
	clock:
		'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z',
	branch:
		'M232,64a32,32,0,1,0-40,31v17a8,8,0,0,1-8,8H96a23.84,23.84,0,0,0-8,1.38V95a32,32,0,1,0-16,0v66a32,32,0,1,0,16,0V144a8,8,0,0,1,8-8h88a24,24,0,0,0,24-24V95A32.06,32.06,0,0,0,232,64ZM64,64A16,16,0,1,1,80,80,16,16,0,0,1,64,64ZM96,192a16,16,0,1,1-16-16A16,16,0,0,1,96,192ZM200,80a16,16,0,1,1,16-16A16,16,0,0,1,200,80Z',
	arrow:
		'M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z',
	check:
		'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z',
	globe:
		'M128,24h0A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm87.62,96H175.79C174,83.49,159.94,57.67,148.41,42.4A88.19,88.19,0,0,1,215.63,120ZM96.23,136h63.54c-2.31,41.61-22.23,67.11-31.77,77C118.45,203.1,98.54,177.6,96.23,136Zm0-16C98.54,78.39,118.46,52.89,128,43c9.55,9.93,29.46,35.43,31.77,77Zm11.36-77.6C96.06,57.67,82,83.49,80.21,120H40.37A88.19,88.19,0,0,1,107.59,42.4ZM40.37,136H80.21c1.82,36.51,15.85,62.33,27.38,77.6A88.19,88.19,0,0,1,40.37,136Zm108,77.6c11.53-15.27,25.56-41.09,27.38-77.6h39.84A88.19,88.19,0,0,1,148.41,213.6Z',
};

export const Icon: React.FC<{
	d: string;
	size: number;
	color?: string;
	style?: React.CSSProperties;
}> = ({d, size, color = 'currentColor', style}) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 256 256"
		fill={color}
		style={{display: 'block', flexShrink: 0, ...style}}
	>
		<path d={d} />
	</svg>
);

const TILE_PATH =
	'M512 0C690 0 779 0 850 36C913 68 956 111 988 174C1024 245 1024 334 1024 512C1024 690 1024 779 988 850C956 913 913 956 850 988C779 1024 690 1024 512 1024C334 1024 245 1024 174 988C111 956 68 913 36 850C0 779 0 690 0 512C0 334 0 245 36 174C68 111 111 68 174 36C245 0 334 0 512 0Z';
export const L_PATH =
	'M37 57C37 59.8284 37.0002 61.2424 37.8789 62.1211C38.7576 62.9998 40.1716 63 43 63H65V74H32C29.1716 74 27.7576 73.9998 26.8789 73.1211C26.0002 72.2424 26 70.8284 26 68V18H37V57Z';

// Lumail app-icon tile, recreated from lumail.io/favicon.svg.
// `draw` animates the L (0 → 0.55 stem, 0.55 → 1 foot). `flat` fades to #ff3300.
export const LumailTile: React.FC<{
	size: number;
	draw?: number;
	flat?: number;
	style?: React.CSSProperties;
}> = ({size, draw = 1, flat = 0, style}) => {
	const id = safeId(useId());
	const stem = Math.min(1, draw / 0.55);
	const foot = Math.max(0, (draw - 0.55) / 0.45);
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 1024 1024"
			style={{display: 'block', overflow: 'visible', ...style}}
		>
			<defs>
				<linearGradient id={`t${id}`} x2="0" y2="1">
					<stop stopColor={C.tileTop} />
					<stop offset="1" stopColor={C.tileBottom} />
				</linearGradient>
				<linearGradient id={`l${id}`} x2="0" y2="1">
					<stop stopColor="#ffffff" />
					<stop offset="1" stopColor="#f6d5d5" />
				</linearGradient>
				<linearGradient id={`r${id}`} x2="0" y2="1">
					<stop stopColor="#ffffff" stopOpacity=".38" />
					<stop offset=".3" stopColor="#ffffff" stopOpacity="0" />
					<stop offset=".8" stopColor="#ffffff" stopOpacity="0" />
					<stop offset="1" stopColor="#ffffff" stopOpacity=".28" />
				</linearGradient>
				<clipPath id={`cs${id}`}>
					<rect x="20" y="10" width="17.5" height={8 + 70 * stem} />
				</clipPath>
				<clipPath id={`cf${id}`}>
					<rect x="36.5" y="50" width={30 * foot} height="30" />
				</clipPath>
			</defs>
			<path d={TILE_PATH} fill={`url(#t${id})`} />
			<path d={TILE_PATH} fill={C.flare} opacity={flat} />
			<path
				d={TILE_PATH}
				fill="none"
				stroke={`url(#r${id})`}
				strokeWidth="12"
				opacity={1 - flat}
			/>
			<g transform="translate(0.125 -5.5) scale(11.25)" opacity={1 - flat}>
				<g clipPath={`url(#cs${id})`}>
					<path d={L_PATH} fill={`url(#l${id})`} />
				</g>
				<g clipPath={`url(#cf${id})`}>
					<path d={L_PATH} fill={`url(#l${id})`} />
				</g>
			</g>
		</svg>
	);
};

export const Wordmark: React.FC<{
	size: number;
	color?: string;
	style?: React.CSSProperties;
}> = ({size, color = C.ink, style}) => (
	<span
		style={{
			fontFamily: FONT,
			fontWeight: 600,
			fontSize: size,
			letterSpacing: '-0.034em',
			lineHeight: 1,
			color,
			...style,
		}}
	>
		Lumail
	</span>
);

// The highlighted word "chip" from the lumail.io hero headline.
export const Chip: React.FC<{
	icon: string;
	children: React.ReactNode;
	fontSize: number;
	progress?: number;
	iconSpin?: number;
	style?: React.CSSProperties;
}> = ({icon, children, fontSize, progress = 1, iconSpin = 0, style}) => (
	<span
		style={{
			display: 'inline-flex',
			alignItems: 'center',
			gap: '0.18em',
			padding: '0 0.22em',
			borderRadius: '0.26em',
			border: `${Math.max(1, fontSize / 60)}px solid ${C.border}`,
			background: C.card,
			boxShadow: SHADOW_CHIP,
			color: C.flare,
			lineHeight: 1.12,
			whiteSpace: 'nowrap',
			fontSize,
			transform: `scale(${progress}) rotate(${(1 - progress) * -6}deg)`,
			...style,
		}}
	>
		<span
			style={{
				display: 'inline-flex',
				width: '0.72em',
				height: '0.72em',
				transform: `rotate(${iconSpin}deg) scale(${0.4 + 0.6 * progress})`,
			}}
		>
			<Icon d={icon} size={fontSize * 0.72} color={C.flare} />
		</span>
		{children}
	</span>
);

export const Badge: React.FC<{
	children: React.ReactNode;
	scale?: number;
	style?: React.CSSProperties;
	dark?: boolean;
}> = ({children, scale = 1, style, dark}) => (
	<div
		style={{
			display: 'inline-flex',
			alignItems: 'center',
			gap: 10 * scale,
			padding: `${6 * scale}px ${14 * scale}px`,
			borderRadius: 999,
			background: dark ? 'rgba(255,99,61,0.14)' : C.blush,
			color: dark ? C.darkFg : C.ink,
			fontFamily: FONT,
			fontWeight: 500,
			fontSize: 20 * scale,
			letterSpacing: '-0.01em',
			...style,
		}}
	>
		<span
			style={{
				width: 8 * scale,
				height: 8 * scale,
				borderRadius: 99,
				background: dark ? C.accentDark : C.ink,
			}}
		/>
		{children}
	</div>
);

export const WashCard: React.FC<{
	children: React.ReactNode;
	pad?: number;
	style?: React.CSSProperties;
	innerStyle?: React.CSSProperties;
}> = ({children, pad = 36, style, innerStyle}) => (
	<div
		style={{
			background: C.wash,
			borderRadius: 28,
			padding: pad,
			...style,
		}}
	>
		<div
			style={{
				background: C.card,
				border: `1.5px solid ${C.border}`,
				borderRadius: 18,
				overflow: 'hidden',
				boxShadow: '0 1px 2px rgba(26,22,20,0.04)',
				height: '100%',
				...innerStyle,
			}}
		>
			{children}
		</div>
	</div>
);

export const WindowBar: React.FC<{
	title: string;
	right?: React.ReactNode;
	dark?: boolean;
	scale?: number;
}> = ({title, right, dark, scale = 1}) => (
	<div
		style={{
			display: 'flex',
			alignItems: 'center',
			gap: 10 * scale,
			height: 58 * scale,
			padding: `0 ${22 * scale}px`,
			borderBottom: `1.5px solid ${dark ? C.darkBorder : C.border}`,
			fontFamily: MONO,
			fontSize: 19 * scale,
			color: dark ? C.darkMuted : C.muted,
		}}
	>
		{[0, 1, 2].map((i) => (
			<span
				key={i}
				style={{
					width: 12 * scale,
					height: 12 * scale,
					borderRadius: 99,
					background: dark ? 'rgba(255,255,255,0.14)' : '#dcd7d0',
				}}
			/>
		))}
		<span style={{marginLeft: 12 * scale}}>{title}</span>
		<span style={{flex: 1}} />
		{right}
	</div>
);

// Primary CTA: rounded, inset highlight + 3px darker base, as on lumail.io.
export const CTAButton: React.FC<{
	label: string;
	fontSize?: number;
	press?: number;
	pill?: boolean;
	style?: React.CSSProperties;
}> = ({label, fontSize = 30, press = 0, pill = true, style}) => (
	<div
		style={{
			display: 'inline-flex',
			alignItems: 'center',
			gap: fontSize * 0.4,
			padding: `${fontSize * 0.62}px ${fontSize * 1.2}px`,
			borderRadius: pill ? 999 : fontSize * 0.5,
			background: C.flare,
			color: '#fff',
			fontFamily: FONT,
			fontWeight: 500,
			fontSize,
			letterSpacing: '-0.01em',
			boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.34), 0 ${
				(1 - press) * 5
			}px 0 0 #b52a06, 0 18px 40px -16px rgba(255,51,0,0.55)`,
			transform: `translateY(${press * 5}px)`,
			...style,
		}}
	>
		{label}
		<Icon d={ICON.arrow} size={fontSize * 0.9} color="#fff" />
	</div>
);

export const Cursor: React.FC<{x: number; y: number; scale?: number; press?: number}> = ({
	x,
	y,
	scale = 1,
	press = 0,
}) => (
	<svg
		width={34 * scale}
		height={44 * scale}
		viewBox="0 0 34 44"
		style={{
			position: 'absolute',
			left: x,
			top: y,
			transform: `scale(${1 - press * 0.12})`,
			transformOrigin: '0 0',
			filter: 'drop-shadow(0 6px 10px rgba(26,22,20,0.28))',
			zIndex: 50,
		}}
	>
		<path
			d="M2 2 L2 34 L10.5 26.5 L16 40 L22 37.5 L16.5 24.5 L28 24.5 Z"
			fill={C.ink}
			stroke="#fff"
			strokeWidth="2.5"
			strokeLinejoin="round"
		/>
	</svg>
);

// Masked word-by-word rise, the core kinetic-type primitive.
export const Rise: React.FC<{
	t: number;
	start: number;
	dur?: number;
	children: React.ReactNode;
	distance?: number;
	style?: React.CSSProperties;
	blur?: boolean;
}> = ({t, start, dur = 0.7, children, distance = 1.05, style, blur}) => {
	const p = tw(t, start, start + dur, E.out);
	return (
		<span
			style={{
				display: 'inline-block',
				overflow: 'hidden',
				verticalAlign: 'top',
				paddingBottom: '0.08em',
				marginBottom: '-0.08em',
				...style,
			}}
		>
			<span
				style={{
					display: 'inline-block',
					transform: `translateY(${(1 - p) * distance * 100}%) rotate(${
						(1 - p) * 4
					}deg)`,
					transformOrigin: '0 100%',
					filter: blur ? `blur(${(1 - p) * 8}px)` : undefined,
				}}
			>
				{children}
			</span>
		</span>
	);
};

export const Words: React.FC<{
	text: string;
	t: number;
	start: number;
	stagger?: number;
	dur?: number;
	color?: string;
	style?: React.CSSProperties;
}> = ({text, t, start, stagger = 0.06, dur = 0.75, color, style}) => (
	<>
		{text.split(' ').map((w, i, arr) => (
			<React.Fragment key={i}>
				<Rise t={t} start={start + i * stagger} dur={dur} style={{color, ...style}}>
					{w}
				</Rise>
				{i < arr.length - 1 ? ' ' : null}
			</React.Fragment>
		))}
	</>
);
