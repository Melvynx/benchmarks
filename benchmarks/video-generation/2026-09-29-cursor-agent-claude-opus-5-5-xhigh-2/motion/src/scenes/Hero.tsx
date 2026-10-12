import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT} from '../theme';
import {
	Chip,
	Cursor,
	E,
	ICON,
	Icon,
	lerp,
	Rise,
	sp,
	tw,
	typed,
	useT,
	Words,
} from '../lib';

const FS = 116;

const Sparks: React.FC<{t: number; start: number}> = ({t, start}) => {
	const pts = [
		[-0.55, -0.9, 30],
		[1.08, -0.75, 24],
		[1.12, 0.6, 18],
		[-0.4, 0.95, 20],
	];
	return (
		<>
			{pts.map(([x, y, s], i) => {
				const p = tw(t, start + i * 0.05, start + 0.6 + i * 0.05, E.out);
				const o = p > 0 ? Math.sin(p * Math.PI) : 0;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: `${50 + x * 50}%`,
							top: `${50 + y * 50}%`,
							transform: `translate(-50%,-50%) scale(${p}) rotate(${p * 90}deg)`,
							opacity: o,
						}}
					>
						<Icon d={ICON.sparkle} size={s} color={C.flare} />
					</div>
				);
			})}
		</>
	);
};

export const Hero: React.FC = () => {
	const t = useT();
	const exit = tw(t, 5.0, 5.5, E.inOut);
	const chip1 = sp(t, 0.42);
	const chip2 = sp(t, 0.95);
	const sub = tw(t, 1.35, 2.0);
	const form = sp(t, 1.75, {damping: 18, stiffness: 140, mass: 0.8});
	const domain = typed('yourbrand.com', t, 2.4, 22);

	const cur = tw(t, 3.05, 3.85, E.inOut);
	const cx = lerp(cur, 1530, 1070);
	const cy = lerp(cur, 1120, 850);
	const press = tw(t, 3.9, 4.0, E.inOut) * (1 - tw(t, 4.02, 4.2, E.out));
	const ripple = tw(t, 3.98, 4.7, E.out);
	const done = tw(t, 4.2, 4.45, E.inOut);

	return (
		<AbsoluteFill style={{transform: `translateY(${-exit * 1080}px)`}}>
			<div
				style={{
					position: 'absolute',
					left: 0,
					width: 1920,
					top: 178,
					textAlign: 'center',
					fontFamily: FONT,
					fontWeight: 500,
					fontSize: FS,
					lineHeight: 1.1,
					letterSpacing: '-0.035em',
					color: C.ink,
				}}
			>
				<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.24em'}}>
					<Rise t={t} start={0.3}>The</Rise>
					<span style={{position: 'relative', display: 'inline-flex'}}>
						<Chip icon={ICON.sparkle} fontSize={FS} progress={chip1} iconSpin={(1 - chip1) * -200}>
							AI Tool
						</Chip>
						<Sparks t={t} start={0.5} />
					</span>
					<Rise t={t} start={0.56}>that</Rise>
				</div>
				<div>
					<Words text="will make you love" t={t} start={0.64} stagger={0.06} />
				</div>
				<div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.24em'}}>
					<Chip icon={ICON.envelopeFill} fontSize={FS} progress={chip2} iconSpin={(1 - chip2) * 120}>
						e-mail
					</Chip>
					<Rise t={t} start={1.08} style={{color: C.flare}}>marketing</Rise>
				</div>
			</div>

			<div
				style={{
					position: 'absolute',
					left: 0,
					width: 1920,
					top: 612,
					textAlign: 'center',
					fontFamily: FONT,
					fontSize: 32,
					lineHeight: 1.5,
					color: C.muted,
					opacity: sub,
					transform: `translateY(${(1 - sub) * 24}px)`,
				}}
			>
				You'll actually like sending emails. And
				<br />
				you'll make more money. That's the deal.
			</div>

			<div
				style={{
					position: 'absolute',
					left: 960 - 330,
					width: 660,
					top: 742,
					opacity: Math.min(1, form * 1.4),
					transform: `translateY(${(1 - form) * 40}px)`,
					fontFamily: FONT,
				}}
			>
				<div
					style={{
						height: 74,
						display: 'flex',
						alignItems: 'stretch',
						background: C.card,
						border: `1.5px solid ${t > 2.3 && t < 3.9 ? '#d6cfc6' : C.border}`,
						borderRadius: 16,
						overflow: 'hidden',
						boxShadow:
							t > 2.3 && t < 3.9
								? '0 0 0 4px rgba(255,51,0,0.12)'
								: '0 1px 2px rgba(26,22,20,0.04)',
					}}
				>
					<div style={{width: 74, display: 'grid', placeItems: 'center', borderRight: `1.5px solid ${C.border}`, color: C.muted}}>
						<Icon d={ICON.globe} size={26} color={C.muted} />
					</div>
					<div style={{flex: 1, display: 'flex', alignItems: 'center', padding: '0 24px', fontSize: 27}}>
						{domain.length ? (
							<span style={{color: C.ink}}>{domain}</span>
						) : (
							<span style={{color: '#a39b93'}}>yourdomain.com</span>
						)}
						{t > 2.3 && t < 3.9 && Math.floor(t * 2.4) % 2 === 0 ? (
							<span style={{width: 2.5, height: 32, background: C.ink, marginLeft: 2}} />
						) : null}
					</div>
				</div>
				<div
					style={{
						position: 'relative',
						marginTop: 14,
						height: 74,
						borderRadius: 16,
						background: C.flare,
						color: '#fff',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 29,
						fontWeight: 500,
						overflow: 'hidden',
						boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.34), 0 ${(1 - press) * 5}px 0 0 #b52a06, 0 22px 40px -18px rgba(255,51,0,0.6)`,
						transform: `translateY(${press * 5}px)`,
					}}
				>
					<div
						style={{
							position: 'absolute',
							left: 440 - 400,
							top: 37 - 400,
							width: 800,
							height: 800,
							borderRadius: 999,
							background: 'rgba(255,255,255,0.35)',
							transform: `scale(${ripple})`,
							opacity: ripple > 0 ? 1 - ripple : 0,
						}}
					/>
					<div style={{display: 'flex', alignItems: 'center', gap: 12, opacity: 1 - done, transform: `translateY(${-done * 30}px)`, position: 'absolute'}}>
						Start free
						<Icon d={ICON.arrow} size={26} color="#fff" />
					</div>
					<div style={{display: 'flex', alignItems: 'center', gap: 12, opacity: done, transform: `translateY(${(1 - done) * 30}px)`, position: 'absolute'}}>
						<Icon d={ICON.check} size={28} color="#fff" />
						You're in. Import your list.
					</div>
				</div>
				<div style={{marginTop: 16, textAlign: 'center', fontSize: 21, color: C.muted}}>
					3,000 emails/month free · no card
				</div>
			</div>
			{t > 3.0 ? <Cursor x={cx} y={cy} scale={1.25} press={press} /> : null}
		</AbsoluteFill>
	);
};
