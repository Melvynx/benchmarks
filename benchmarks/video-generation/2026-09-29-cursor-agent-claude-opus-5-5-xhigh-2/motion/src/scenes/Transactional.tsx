import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO} from '../theme';
import {Badge, E, ICON, Icon, lerp, sp, tw, useT, Words} from '../lib';
import {PageFrame} from '../chrome';
import {NODES} from '../layout';

const K = '#ff7a55';
const S = '#3fbd87';
const P = C.darkMuted;
const F = C.darkFg;

type Tok = [string, string];
const CODE: Tok[][] = [
	[['import', K], [' { ', P], ['Lumail', F], [' } ', P], ['from', K], [' "lumail"', S], [';', P]],
	[],
	[['await', K], [' lumail.emails.', F], ['send', '#f0c674'], ['({', P]],
	[['  to: ', F], ['"user@app.com"', S], [',', P]],
	[['  from: ', F], ['"hello@yourdomain.com"', S], [',', P]],
	[['  subject: ', F], ['"Your login code"', S], [',', P]],
	[['  content: ', F], ['"# Your code\\n\\n{{code}}"', S], [',', P]],
	[['});', P]],
];

const Code: React.FC<{chars: number}> = ({chars}) => {
	let left = chars;
	return (
		<>
			{CODE.map((line, li) => {
				const parts = line.map(([txt, col], ti) => {
					const n = Math.max(0, Math.min(txt.length, left));
					left -= txt.length;
					return (
						<span key={ti} style={{color: col}}>
							{txt.slice(0, n)}
						</span>
					);
				});
				left -= 1;
				return (
					<div key={li} style={{minHeight: '1.7em', whiteSpace: 'pre'}}>
						<span style={{color: 'rgba(255,255,255,0.22)', display: 'inline-block', width: 44}}>{li + 1}</span>
						{parts}
					</div>
				);
			})}
		</>
	);
};

const Env: React.FC<{x: number; o: number}> = ({x, o}) => (
	<div
		style={{
			position: 'absolute',
			left: x,
			top: 30,
			width: 46,
			height: 34,
			borderRadius: 7,
			background: 'rgba(255,255,255,0.07)',
			border: '1.5px solid rgba(255,255,255,0.12)',
			display: 'grid',
			placeItems: 'center',
			opacity: o,
		}}
	>
		<Icon d={ICON.envelope} size={20} color="rgba(255,255,255,0.45)" />
	</div>
);

export const Transactional: React.FC = () => {
	const t = useT();
	const origin = NODES[4];
	const ox = origin.x + 135;
	const oy = origin.y;
	const r = tw(t, 0, 0.62, E.inOut) * 2300;
	const chars = Math.floor(Math.max(0, t - 0.6) * 150);
	const queued = tw(t, 1.9, 2.15);
	const fly = tw(t, 2.15, 2.75, E.inOut);
	const delivered = sp(t, 2.72);
	const card = sp(t, 0.3, {damping: 18, stiffness: 120, mass: 0.9});

	// Blinds exit: 8 strips retract upward, revealing pricing underneath.
	const strips = 8;
	const hS = 1080 / strips;
	const pts: string[] = [];
	for (let i = 0; i < strips; i++) {
		const p = tw(t, 4.0 + i * 0.035, 4.32 + i * 0.035, E.in);
		const y0 = i * hS;
		const y1 = y0 + hS * (1 - p);
		pts.push(`0px ${y0}px`, `1920px ${y0}px`, `1920px ${y1}px`, `0px ${y1}px`);
	}
	const blinds = t >= 4.0 ? `polygon(${pts.join(',')})` : undefined;

	return (
		<AbsoluteFill
			style={{
				background: C.darkBg,
				clipPath: blinds ?? `circle(${r}px at ${ox}px ${oy}px)`,
				fontFamily: FONT,
			}}
		>
			<PageFrame scrollY={t * 30} draw={1} color="rgba(255,255,255,0.07)" lineColor="rgba(255,255,255,0.08)" />
			<div
				style={{
					position: 'absolute',
					left: ox - 400,
					top: oy - 400,
					width: 800,
					height: 800,
					borderRadius: 999,
					background: 'radial-gradient(circle, rgba(255,99,61,0.18), rgba(255,99,61,0) 65%)',
					opacity: 1 - tw(t, 0.4, 1.4),
				}}
			/>
			<div style={{position: 'absolute', left: 150, top: 230, width: 700}}>
				<div style={{opacity: tw(t, 0.4, 0.7)}}>
					<Badge scale={1.2} dark>
						Transactional
					</Badge>
				</div>
				<div style={{marginTop: 26, fontSize: 88, fontWeight: 500, lineHeight: 1.04, letterSpacing: '-0.04em', color: C.darkFg}}>
					<div><Words text="Replace Resend." t={t} start={0.45} /></div>
					<div><Words text="Same domain." t={t} start={0.65} color={C.accentDark} /></div>
				</div>
				<div style={{marginTop: 30, fontSize: 29, lineHeight: 1.5, color: C.darkMuted, opacity: tw(t, 0.9, 1.4)}}>
					Receipts, login codes, and the newsletter leave through the domain you already warmed up. One dashboard. One bill.
				</div>
			</div>

			<div
				style={{
					position: 'absolute',
					left: 900,
					top: 150,
					width: 880,
					height: 540,
					borderRadius: 22,
					background: C.darkCard,
					border: `1.5px solid ${C.darkBorder}`,
					boxShadow: '0 40px 80px -30px rgba(0,0,0,0.6)',
					overflow: 'hidden',
					transform: `translateY(${(1 - card) * 80}px)`,
					opacity: Math.min(1, card * 1.5),
				}}
			>
				<div style={{display: 'flex', alignItems: 'center', gap: 10, height: 60, padding: '0 24px', borderBottom: `1.5px solid ${C.darkBorder}`, fontFamily: MONO, fontSize: 20, color: C.darkMuted}}>
					{[0, 1, 2].map((i) => (
						<span key={i} style={{width: 12, height: 12, borderRadius: 9, background: 'rgba(255,255,255,0.14)'}} />
					))}
					<span style={{marginLeft: 12}}>send.ts</span>
				</div>
				<div style={{padding: '30px 34px', fontFamily: MONO, fontSize: 25, lineHeight: 1.7}}>
					<Code chars={chars} />
					<div style={{marginTop: 14, color: S, opacity: queued, display: 'flex', alignItems: 'center', gap: 10, fontSize: 22}}>
						<Icon d={ICON.check} size={22} color={S} /> queued · priority lane
					</div>
				</div>
			</div>

			{[0, 1].map((lane) => {
				const top = 736 + lane * 128;
				const lp = tw(t, 0.9 + lane * 0.12, 1.4 + lane * 0.12);
				return (
					<div
						key={lane}
						style={{
							position: 'absolute',
							left: 150,
							top,
							width: 1630,
							height: 104,
							borderRadius: 18,
							background: lane ? 'rgba(255,99,61,0.08)' : 'rgba(255,255,255,0.03)',
							border: `1.5px solid ${lane ? 'rgba(255,99,61,0.28)' : C.darkBorder}`,
							overflow: 'hidden',
							opacity: lp,
							transform: `translateX(${(1 - lp) * -60}px)`,
						}}
					>
						<div
							style={{
								position: 'absolute',
								left: 26,
								top: 0,
								height: 104,
								display: 'flex',
								alignItems: 'center',
								fontFamily: MONO,
								fontSize: 18,
								letterSpacing: '0.14em',
								color: lane ? C.accentDark : C.darkMuted,
								zIndex: 2,
								width: 330,
								background: lane ? 'linear-gradient(90deg, #2a1a14 75%, rgba(42,26,20,0))' : `linear-gradient(90deg, ${C.darkBg} 75%, rgba(22,20,18,0))`,
							}}
						>
							{lane ? 'PRIORITY LANE' : 'CAMPAIGN · 50,000'}
						</div>
						{lane === 0
							? new Array(26).fill(0).map((_, i) => {
									const x = ((i * 70 + t * 150) % 1820) - 60;
									return <Env key={i} x={x} o={x > 300 ? 1 : 0.2} />;
								})
							: null}
						{lane === 1 ? (
							<>
								{[0.18, 0.12, 0.06, 0].map((lag, gi) => {
									const f = tw(t, 2.15 + lag, 2.75 + lag, E.inOut);
									const x = lerp(f, -420, 1030);
									return (
										<div
											key={gi}
											style={{
												position: 'absolute',
												left: x,
												top: 24,
												height: 56,
												padding: '0 22px',
												borderRadius: 999,
												background: gi === 3 ? C.accentDark : 'rgba(255,99,61,0.35)',
												color: '#fff',
												display: 'flex',
												alignItems: 'center',
												gap: 12,
												fontSize: 22,
												fontWeight: 500,
												opacity: gi === 3 ? 1 : 0.35 * Math.sin(fly * Math.PI),
												whiteSpace: 'nowrap',
												boxShadow: gi === 3 ? '0 10px 30px -8px rgba(255,99,61,0.7)' : undefined,
											}}
										>
											<Icon d={ICON.envelopeFill} size={24} color="#fff" />
											Your login code · <span style={{fontFamily: MONO}}>482 913</span>
										</div>
									);
								})}
								<div
									style={{
										position: 'absolute',
										right: 24,
										top: 24,
										height: 56,
										padding: '0 22px',
										borderRadius: 999,
										display: 'flex',
										alignItems: 'center',
										gap: 10,
										fontSize: 22,
										fontWeight: 500,
										background: delivered > 0.02 ? 'rgba(63,189,135,0.16)' : 'rgba(255,255,255,0.05)',
										color: delivered > 0.02 ? S : C.darkMuted,
										transform: `scale(${1 + Math.sin(Math.min(1, delivered) * Math.PI) * 0.12})`,
									}}
								>
									<Icon d={ICON.check} size={22} color={delivered > 0.02 ? S : C.darkMuted} />
									Delivered
								</div>
							</>
						) : null}
					</div>
				);
			})}
		</AbsoluteFill>
	);
};
