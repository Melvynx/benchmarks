import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {C, FONT, HAND, MONO} from '../theme';
import {Badge, E, fmt, ICON, Icon, lerp, sp, tw, useT, Words} from '../lib';

const TICKS = [
	{f: 0, v: 1000, l: '1K'},
	{f: 0.16, v: 5000, l: '5K'},
	{f: 0.32, v: 20000, l: '20K'},
	{f: 0.42, v: 40000, l: '40K'},
	{f: 0.58, v: 100000, l: '100K'},
	{f: 0.79, v: 400000, l: '400K'},
	{f: 1, v: 1000000, l: '1M'},
];

const valueAt = (f: number) =>
	Math.exp(
		interpolate(
			f,
			TICKS.map((x) => x.f),
			TICKS.map((x) => Math.log(x.v)),
		),
	);

const PLANS = [
	{name: 'Free', price: 0, max: 3000, feats: ['3,000 emails/month', '2 team members', 'Unlimited workflows']},
	{name: 'Creator', price: 20, max: 40000, feats: ['40,000 emails/month', '10 team members', '100 AI conversations/mo']},
	{name: 'Pro', price: 60, max: 100000, feats: ['100,000 emails/month', '25 team members', '300 AI conversations/mo']},
	{name: 'Business', price: 200, max: 400000, feats: ['400,000 emails/month', '100 team members', '1,000 AI conversations/mo']},
];

const TRACK_L = 170;
const TRACK_W = 1580;

export const Pricing: React.FC = () => {
	const t = useT();
	const exit = tw(t, 5.0, 5.5, E.inOut);
	const knob = tw(t, 0.9, 2.2, E.inOut) * 0.42;
	const raw = valueAt(knob);
	const value = raw > 38500 ? 40000 : raw;
	const best = PLANS.findIndex((p) => value <= p.max);
	const subs = lerp(tw(t, 2.5, 3.9, E.inOut), 1204, 50000);
	const note = tw(t, 3.9, 4.5, E.inOut);
	const statCard = sp(t, 0.5, {damping: 16, stiffness: 140, mass: 0.8});

	return (
		<AbsoluteFill
			style={{
				fontFamily: FONT,
				opacity: 1 - exit,
				transform: `scale(${lerp(exit, 1, 0.93)})`,
				filter: exit > 0 ? `blur(${exit * 10}px)` : undefined,
			}}
		>
			<div style={{position: 'absolute', left: 150, top: 140}}>
				<div style={{opacity: tw(t, 0.3, 0.6)}}>
					<Badge scale={1.2}>Pricing</Badge>
				</div>
				<div style={{marginTop: 22, fontSize: 80, fontWeight: 500, lineHeight: 1.05, letterSpacing: '-0.04em', color: C.ink}}>
					<div><Words text="You pay for emails sent." t={t} start={0.35} /></div>
					<div><Words text="Never for subscribers stored." t={t} start={0.6} /></div>
				</div>
			</div>

			<div
				style={{
					position: 'absolute',
					left: 1280,
					top: 150,
					width: 480,
					padding: '24px 30px',
					borderRadius: 20,
					background: C.card,
					border: `1.5px solid ${C.border}`,
					boxShadow: '0 20px 50px -30px rgba(26,22,20,0.35)',
					transform: `translateY(${(1 - statCard) * 60}px)`,
					opacity: Math.min(1, statCard * 1.6),
				}}
			>
				<div style={{fontFamily: MONO, fontSize: 17, letterSpacing: '0.16em', color: C.muted}}>SUBSCRIBERS STORED</div>
				<div style={{fontSize: 66, fontWeight: 500, letterSpacing: '-0.04em', color: C.ink, marginTop: 4, fontVariantNumeric: 'tabular-nums'}}>
					{fmt(subs)}
				</div>
				<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 12, borderTop: `1.5px dashed ${C.border}`, fontSize: 22}}>
					<span style={{color: C.muted}}>Added to your bill</span>
					<span style={{color: C.green, fontWeight: 600, fontFamily: MONO}}>$0.00</span>
				</div>
				<div
					style={{
						position: 'absolute',
						left: 6,
						top: 222,
						fontFamily: HAND,
						fontWeight: 600,
						fontSize: 46,
						color: C.flare,
						transform: 'rotate(-3deg)',
						clipPath: `inset(-30% ${(1 - note) * 100}% -30% 0)`,
						whiteSpace: 'nowrap',
					}}
				>
					unlimited, on every plan
				</div>
			</div>

			<div style={{position: 'absolute', left: TRACK_L, top: 448, width: TRACK_W, opacity: tw(t, 0.5, 0.9)}}>
				<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
					<div>
						<div style={{fontSize: 26, fontWeight: 500, color: C.ink}}>Emails you send each month</div>
						<div style={{fontSize: 20, color: C.muted, marginTop: 4}}>We pick the cheapest plan for that volume.</div>
					</div>
					<div
						style={{
							width: 230,
							height: 64,
							borderRadius: 12,
							border: `1.5px solid ${C.border}`,
							background: C.card,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'flex-end',
							padding: '0 20px',
							fontSize: 34,
							fontWeight: 500,
							color: C.ink,
							fontVariantNumeric: 'tabular-nums',
						}}
					>
						{fmt(value)}
					</div>
				</div>
				<div style={{position: 'relative', marginTop: 30, height: 30}}>
					<div style={{position: 'absolute', left: 0, right: 0, top: 12, height: 7, borderRadius: 9, background: '#dedad4'}} />
					<div style={{position: 'absolute', left: 0, width: knob * TRACK_W, top: 12, height: 7, borderRadius: 9, background: C.flare}} />
					<div
						style={{
							position: 'absolute',
							left: knob * TRACK_W - 16,
							top: 0,
							width: 32,
							height: 32,
							borderRadius: 99,
							background: C.flare,
							border: '4px solid #fff',
							boxShadow: '0 0 0 1.5px rgba(255,51,0,0.35), 0 6px 14px rgba(255,51,0,0.35)',
						}}
					/>
				</div>
				<div style={{position: 'relative', height: 30, marginTop: 10, fontFamily: MONO, fontSize: 17, color: C.muted}}>
					{TICKS.map((tk) => (
						<div
							key={tk.l}
							style={{
								position: 'absolute',
								left: tk.f * TRACK_W,
								transform: 'translateX(-50%)',
								color: Math.abs(tk.f - knob) < 0.01 ? C.ink : C.muted,
								fontWeight: Math.abs(tk.f - knob) < 0.01 ? 500 : 400,
							}}
						>
							{tk.l}
						</div>
					))}
				</div>
			</div>

			{PLANS.map((p, i) => {
				const rise = sp(t, 0.55 + i * 0.08, {damping: 15, stiffness: 150, mass: 0.8});
				const on = i === best;
				const x = 150 + i * 412;
				return (
					<div
						key={p.name}
						style={{
							position: 'absolute',
							left: x,
							top: 648,
							width: 392,
							height: 340,
							boxSizing: 'border-box',
							padding: '28px 30px',
							borderRadius: 20,
							background: C.card,
							border: `${on ? 2.5 : 1.5}px solid ${on ? C.flare : C.border}`,
							boxShadow: on ? '0 30px 60px -30px rgba(255,51,0,0.45)' : '0 10px 30px -24px rgba(26,22,20,0.3)',
							transform: `translateY(${(1 - rise) * 200 + (on ? -12 : 0)}px)`,
							opacity: Math.min(1, rise * 1.5),
						}}
					>
						<div style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 25, fontWeight: 500, color: C.ink}}>
							{p.name}
							{on ? (
								<span style={{fontSize: 16, padding: '4px 10px', borderRadius: 99, background: C.blush, color: C.accentDeep}}>For this volume</span>
							) : null}
						</div>
						<div style={{display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10}}>
							<span style={{fontSize: 64, fontWeight: 500, letterSpacing: '-0.04em', color: C.ink}}>${p.price}</span>
							<span style={{fontSize: 21, color: C.muted}}>/month</span>
						</div>
						<div
							style={{
								marginTop: 14,
								height: 50,
								borderRadius: 999,
								display: 'grid',
								placeItems: 'center',
								fontSize: 20,
								fontWeight: 500,
								background: on ? C.flare : C.secondary,
								color: on ? '#fff' : C.ink,
								border: on ? 'none' : `1.5px solid ${C.border}`,
							}}
						>
							{i === 0 ? 'Start free' : `Start with ${p.name}`}
						</div>
						<div style={{marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10}}>
							{p.feats.map((f) => (
								<div key={f} style={{display: 'flex', alignItems: 'center', gap: 12, fontSize: 20, color: '#3b3430'}}>
									<Icon d={ICON.check} size={18} color={C.ink} />
									{f}
								</div>
							))}
						</div>
					</div>
				);
			})}
		</AbsoluteFill>
	);
};
