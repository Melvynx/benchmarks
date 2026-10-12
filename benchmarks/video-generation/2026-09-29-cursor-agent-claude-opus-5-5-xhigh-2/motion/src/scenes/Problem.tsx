import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, HAND} from '../theme';
import {E, ICON, Icon, lerp, Rise, sp, tw, useT, Words} from '../lib';
import {PageFrame} from '../chrome';

type Clutter = {
	x: number;
	y: number;
	rot: number;
	title: string;
	sub: string;
	glyph: React.ReactNode;
};

const Grid = () => (
	<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, width: 26}}>
		{[0, 1, 2, 3].map((i) => (
			<div key={i} style={{width: 11, height: 11, borderRadius: 3, background: C.ink}} />
		))}
	</div>
);
const Toggle = () => (
	<div style={{width: 40, height: 24, borderRadius: 99, background: C.border, position: 'relative'}}>
		<div style={{position: 'absolute', left: 3, top: 3, width: 18, height: 18, borderRadius: 99, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.2)'}} />
	</div>
);
const Warn = () => (
	<div style={{width: 28, height: 28, borderRadius: 99, background: C.flare, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: FONT, fontWeight: 700, fontSize: 19}}>!</div>
);
const File = () => (
	<div style={{width: 24, height: 30, borderRadius: 4, border: `2.5px solid ${C.ink}`, position: 'relative'}}>
		<div style={{position: 'absolute', left: 4, right: 4, top: 8, height: 2.5, background: C.ink}} />
		<div style={{position: 'absolute', left: 4, right: 7, top: 14, height: 2.5, background: C.ink}} />
	</div>
);
const Retro = () => (
	<div style={{width: 36, height: 26, borderRadius: 4, background: 'linear-gradient(90deg,#f0f,#0ff,#ff0,#0f0)', border: '2px solid #333'}} />
);

const CLUTTER: Clutter[] = [
	{x: 400, y: 185, rot: -5, title: 'Template gallery', sub: '1,204 templates to pick from', glyph: <Grid />},
	{x: 1000, y: 210, rot: 3, title: 'Settings › Advanced › SMTP', sub: '38 fields left to fill', glyph: <Toggle />},
	{x: 1545, y: 170, rot: -2, title: 'Tue · 11:47 PM', sub: 'Campaign still not sent', glyph: <Icon d={ICON.clock} size={28} color={C.ink} />},
	{x: 390, y: 880, rot: 4, title: 'Upgrade required', sub: 'You hit 2,500 subscribers', glyph: <Warn />},
	{x: 930, y: 930, rot: -3, title: 'campaign_final_v7.html', sub: 'Edited 14 times', glyph: <File />},
	{x: 1520, y: 870, rot: 5, title: 'Inbox preview', sub: 'Still looks like 2019', glyph: <Retro />},
];

export const Problem: React.FC = () => {
	const t = useT();
	const lift = tw(t, 4.0, 4.5, E.inOut);
	const strike = tw(t, 2.55, 2.95, E.inOut);
	const hand = tw(t, 3.3, 3.85, E.inOut);
	const chipPop = sp(t, 0.8);

	return (
		<AbsoluteFill
			style={{
				background: C.flare,
				transform: `translateY(${-lift * 1080}px)`,
				boxShadow: '0 30px 80px rgba(26,22,20,0.35)',
			}}
		>
			<PageFrame
				scrollY={t * 40}
				draw={1}
				color="rgba(255,255,255,0.28)"
				lineColor="rgba(255,255,255,0.3)"
			/>
			{CLUTTER.map((c, i) => {
				const inP = sp(t, 1.2 + i * 0.14, {damping: 11, stiffness: 190, mass: 0.6});
				const out = tw(t, 2.9 + i * 0.04, 3.45 + i * 0.04, E.in);
				const dx = c.x - 960;
				const dy = c.y - 540;
				const wob = Math.sin(t * 9 + i * 1.7) * 1.8 * (1 - out);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: c.x,
							top: c.y,
							transform: `translate(-50%,-50%) translate(${dx * out * 1.4}px, ${dy * out * 1.6 + out * 200}px) rotate(${c.rot + wob + out * c.rot * 8}deg) scale(${inP * lerp(out, 1, 0.6)})`,
							opacity: 1 - out,
							display: 'flex',
							alignItems: 'center',
							gap: 18,
							padding: '18px 26px 18px 20px',
							background: '#fff',
							borderRadius: 18,
							boxShadow: '0 2px 0 rgba(26,22,20,0.06), 0 22px 40px -18px rgba(90,20,0,0.55)',
							fontFamily: FONT,
							whiteSpace: 'nowrap',
						}}
					>
						<div style={{width: 48, height: 48, borderRadius: 12, background: C.soft, display: 'grid', placeItems: 'center'}}>
							{c.glyph}
						</div>
						<div>
							<div style={{fontSize: 24, fontWeight: 600, color: C.ink, letterSpacing: '-0.02em'}}>{c.title}</div>
							<div style={{fontSize: 19, color: C.muted, marginTop: 2}}>{c.sub}</div>
						</div>
					</div>
				);
			})}
			<div
				style={{
					position: 'absolute',
					left: 0,
					width: 1920,
					top: 352,
					textAlign: 'center',
					fontFamily: FONT,
					fontWeight: 500,
					fontSize: 118,
					lineHeight: 1.08,
					letterSpacing: '-0.04em',
					color: '#fff',
				}}
			>
				<div>
					<Words text="Running email marketing" t={t} start={0.1} stagger={0.07} />
				</div>
				<div>
					<Words text="shouldn't feel like" t={t} start={0.4} stagger={0.07} />
				</div>
				<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.26em'}}>
					<Rise t={t} start={0.68}>a</Rise>
					<span style={{position: 'relative', display: 'inline-flex'}}>
						<span
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: '0.18em',
								padding: '0 0.22em',
								borderRadius: '0.26em',
								background: '#fff',
								color: C.flare,
								lineHeight: 1.12,
								transform: `scale(${chipPop}) rotate(${(1 - chipPop) * -8}deg)`,
								boxShadow: '0 20px 40px -18px rgba(90,20,0,0.6)',
							}}
						>
							<span style={{display: 'inline-flex', transform: `rotate(${t * 220}deg)`}}>
								<Icon d={ICON.clock} size={118 * 0.7} color={C.flare} />
							</span>
							second job.
						</span>
						<svg
							viewBox="0 0 620 120"
							preserveAspectRatio="none"
							style={{
								position: 'absolute',
								left: '-3%',
								width: '106%',
								top: 12,
								height: 120,
								overflow: 'visible',
							}}
						>
							<path
								d="M10 70 C 120 52, 220 78, 330 58 S 520 50, 610 62"
								fill="none"
								stroke={C.ink}
								strokeWidth={10}
								strokeLinecap="round"
								strokeDasharray={640}
								strokeDashoffset={640 * (1 - strike)}
							/>
						</svg>
					</span>
				</div>
			</div>
			<div
				style={{
					position: 'absolute',
					left: 0,
					width: 1920,
					top: 800,
					textAlign: 'center',
					fontFamily: HAND,
					fontWeight: 600,
					fontSize: 76,
					color: '#fff',
					transform: 'rotate(-3deg)',
				}}
			>
				<span
					style={{
						display: 'inline-block',
						clipPath: `inset(-30% ${(1 - hand) * 100}% -30% 0)`,
					}}
				>
					so we fixed it.
				</span>
			</div>
		</AbsoluteFill>
	);
};
