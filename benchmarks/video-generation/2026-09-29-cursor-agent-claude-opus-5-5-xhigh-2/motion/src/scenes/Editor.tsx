import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, SHADOW_CARD} from '../theme';
import {
	Badge,
	Cursor,
	E,
	ICON,
	Icon,
	lerp,
	sp,
	SPRING_SOFT,
	tw,
	typed,
	useT,
	Words,
} from '../lib';
import {EDITOR_RECT, NODE_H, NODE_W, NODES} from '../layout';

const TB: React.FC<{children: React.ReactNode; active?: boolean}> = ({children, active}) => (
	<div
		style={{
			width: 46,
			height: 44,
			borderRadius: 8,
			display: 'grid',
			placeItems: 'center',
			background: active ? C.secondary : 'transparent',
			color: C.ink,
			fontSize: 22,
		}}
	>
		{children}
	</div>
);
const Group: React.FC<{children: React.ReactNode}> = ({children}) => (
	<div style={{display: 'flex', padding: 4, gap: 2, background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 12}}>
		{children}
	</div>
);
const Lines: React.FC<{align: 'l' | 'c' | 'r'}> = ({align}) => (
	<svg width="22" height="18" viewBox="0 0 22 18">
		{[0, 1, 2, 3].map((i) => {
			const w = i % 2 ? 14 : 22;
			const x = align === 'l' ? 0 : align === 'c' ? (22 - w) / 2 : 22 - w;
			return <rect key={i} x={x} y={i * 5} width={w} height={2.2} rx={1} fill={C.ink} />;
		})}
	</svg>
);

const P1 = 'last month you asked for one thing more than anything else: a way to stop sending the welcome email by hand.'.split(' ');
const P2_OLD = 'It shipped. Drag a trigger, an email and a wait. Publish once, and the sequence keeps running without you.';
const P2_NEW = 'It shipped. Build the sequence once. It keeps running without you.';

export const Editor: React.FC = () => {
	const t = useT();
	const enter = tw(t, 0, 0.5, E.inOut);
	const card = sp(t, 0.1, SPRING_SOFT);

	const title = typed('The workflow builder is live', t, 0.55, 38);
	const p1Words = Math.floor(Math.max(0, t - 1.35) * 30);
	const chip = sp(t, 1.38);
	const p2Words = Math.floor(Math.max(0, t - 2.2) * 30);
	const sel = tw(t, 3.0, 3.35, E.inOut);
	const pop = sp(t, 3.25, {damping: 16, stiffness: 200, mass: 0.6});
	const cur = tw(t, 3.15, 3.7, E.inOut);
	const press = tw(t, 3.72, 3.78) * (1 - tw(t, 3.8, 3.95));
	const swap = tw(t, 3.85, 4.15, E.inOut);
	const shimmer = tw(t, 3.85, 4.5, E.inOut);
	const btn = sp(t, 4.25, {damping: 12, stiffness: 170, mass: 0.7});
	const words = swap > 0.5 ? 58 : Math.min(71, Math.floor(p1Words + p2Words + title.split(' ').length + 2));

	// Morph: editor card collapses into workflow node #2 (handoff at local 5.5).
	const m = tw(t, 5.0, 5.5, E.inOut);
	const fadeContent = 1 - tw(t, 5.0, 5.18, E.inOut);
	const n = NODES[1];
	const rx = lerp(m, EDITOR_RECT.x, n.x);
	const ry = lerp(m, EDITOR_RECT.y, n.y - NODE_H / 2);
	const rw = lerp(m, EDITOR_RECT.w, NODE_W);
	const rh = lerp(m, EDITOR_RECT.h, NODE_H);
	const textOut = tw(t, 5.0, 5.3, E.inOut);
	const nodeIn = tw(t, 5.3, 5.5, E.inOut);

	return (
		<AbsoluteFill style={{transform: `translateX(${(1 - enter) * 1920}px)`, filter: enter < 1 ? `blur(${Math.sin(enter * Math.PI) * 10}px)` : undefined}}>
			<div
				style={{
					position: 'absolute',
					left: 1090,
					top: 300,
					width: 680,
					fontFamily: FONT,
					opacity: 1 - textOut,
					transform: `translateX(${textOut * 80}px)`,
				}}
			>
				<div style={{opacity: tw(t, 0.3, 0.6)}}>
					<Badge scale={1.2}>Editor</Badge>
				</div>
				<div style={{marginTop: 26, fontSize: 88, fontWeight: 500, lineHeight: 1.04, letterSpacing: '-0.04em', color: C.ink}}>
					<div><Words text="Write the email," t={t} start={0.35} /></div>
					<div><Words text="not the layout." t={t} start={0.55} /></div>
				</div>
				<div style={{marginTop: 30, fontSize: 30, lineHeight: 1.5, color: C.muted, opacity: tw(t, 0.8, 1.3), transform: `translateY(${(1 - tw(t, 0.8, 1.3)) * 20}px)`}}>
					Type like a document. Variables, buttons, and a preview that looks like the inbox. The AI tightens a paragraph when you ask.{' '}
					<span style={{color: C.ink}}>It does not rewrite your voice.</span>
				</div>
			</div>

			<div
				style={{
					position: 'absolute',
					left: 140,
					top: 150,
					width: 860,
					height: 840,
					borderRadius: 28,
					background: C.wash,
					opacity: Math.min(1, card * 1.5) * (1 - tw(t, 5.0, 5.25)),
					transform: `translateY(${(1 - card) * 120}px)`,
				}}
			/>
			<div
				style={{
					position: 'absolute',
					left: rx,
					top: ry + (1 - card) * 120,
					width: rw,
					height: rh,
					background: C.card,
					border: `1.5px solid ${C.border}`,
					borderRadius: lerp(m, 18, 14),
					overflow: 'hidden',
					boxShadow: SHADOW_CARD,
					opacity: Math.min(1, card * 1.5),
					fontFamily: FONT,
				}}
			>
				<div style={{opacity: fadeContent, width: EDITOR_RECT.w, height: EDITOR_RECT.h, display: 'flex', flexDirection: 'column'}}>
					<div style={{display: 'flex', gap: 12, padding: 18, background: '#f7f6f3', borderBottom: `1.5px solid ${C.border}`}}>
						<Group>
							<TB active><b>B</b></TB>
							<TB><i style={{fontFamily: 'Georgia, serif'}}>I</i></TB>
							<TB><u>U</u></TB>
							<TB><s>S</s></TB>
						</Group>
						<Group>
							<TB><div style={{width: 20, height: 2.4, background: C.ink}} /></TB>
							<TB>
								<svg width="24" height="24" viewBox="0 0 256 256" fill={C.ink}><path d="M137.54,186.36a8,8,0,0,1,0,11.31l-9.94,10A56,56,0,0,1,48.38,128.4L72.5,104.28A56,56,0,0,1,149.31,102a8,8,0,1,1-10.64,12,40,40,0,0,0-54.85,1.63L59.7,139.72a40,40,0,0,0,56.58,56.58l9.94-9.94A8,8,0,0,1,137.54,186.36Zm70.08-138a56.08,56.08,0,0,0-79.22,0l-9.94,9.95a8,8,0,0,0,11.32,11.31l9.94-9.94a40,40,0,0,1,56.58,56.58L172.18,140.4A40,40,0,0,1,117.33,142,8,8,0,1,0,106.69,154a56,56,0,0,0,76.81-2.26l24.12-24.12A56.08,56.08,0,0,0,207.62,48.38Z" /></svg>
							</TB>
						</Group>
						<Group>
							<TB active><Lines align="l" /></TB>
							<TB><Lines align="c" /></TB>
							<TB><Lines align="r" /></TB>
						</Group>
					</div>
					<div style={{flex: 1, padding: '38px 44px', position: 'relative'}}>
						<div style={{fontSize: 50, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, color: '#141b2d', minHeight: 58}}>
							{title}
							{t > 0.5 && t < 1.35 && Math.floor(t * 4) % 2 === 0 ? <span style={{display: 'inline-block', width: 3, height: 48, background: C.flare, marginLeft: 3, verticalAlign: -6}} /> : null}
						</div>
						<div style={{marginTop: 24, fontSize: 27, lineHeight: 1.6, color: '#2b2521'}}>
							{p1Words > 0 ? 'Hi ' : ''}
							{p1Words > 0 ? (
								<span
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										gap: 6,
										padding: '0 10px',
										borderRadius: 8,
										border: `1.5px solid ${C.border}`,
										background: C.soft,
										fontFamily: MONO,
										fontSize: 22,
										lineHeight: 1.5,
										transform: `scale(${chip})`,
										verticalAlign: 2,
									}}
								>
									<span style={{color: C.flare}}>{'{}'}</span> firstName
								</span>
							) : null}
							{p1Words > 0 ? ', ' : ''}
							{P1.slice(0, Math.max(0, p1Words - 1)).join(' ')}
						</div>
						<div style={{marginTop: 22, fontSize: 27, lineHeight: 1.6, color: '#2b2521', position: 'relative', minHeight: 86}}>
							<span
								style={{
									position: 'relative',
									opacity: 1 - swap,
									backgroundImage: `linear-gradient(${C.blush}, ${C.blush})`,
									backgroundRepeat: 'no-repeat',
									backgroundSize: `${sel * 100}% 100%`,
									boxDecorationBreak: 'clone',
									WebkitBoxDecorationBreak: 'clone',
									borderRadius: 6,
									padding: '2px 0',
								}}
							>
								{P2_OLD.split(' ').slice(0, p2Words).join(' ')}
							</span>
							<span
								style={{
									position: 'absolute',
									left: 0,
									top: 0,
									opacity: swap,
									backgroundImage: `linear-gradient(90deg, #2b2521 0%, #2b2521 ${shimmer * 100 - 20}%, ${C.flare} ${shimmer * 100}%, #2b2521 ${shimmer * 100 + 20}%, #2b2521 100%)`,
									WebkitBackgroundClip: 'text',
									color: 'transparent',
								}}
							>
								{P2_NEW}
							</span>
							<div
								style={{
									position: 'absolute',
									left: 120,
									top: -78,
									display: 'flex',
									gap: 4,
									padding: 6,
									borderRadius: 14,
									background: C.card,
									border: `1.5px solid ${C.border}`,
									boxShadow: '0 16px 40px -12px rgba(26,22,20,0.3)',
									fontSize: 21,
									fontWeight: 500,
									transform: `scale(${pop}) translateY(${(1 - pop) * 10}px)`,
									opacity: Math.min(1, pop * 2) * (1 - tw(t, 4.0, 4.2)),
									transformOrigin: '30% 100%',
									whiteSpace: 'nowrap',
								}}
							>
								<div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', color: C.flare}}>
									<Icon d={ICON.sparkle} size={20} color={C.flare} /> Ask AI
								</div>
								<div style={{padding: '8px 14px', borderRadius: 9, background: press > 0 || t > 3.7 ? C.blush : C.soft, color: C.ink}}>Tighten</div>
								<div style={{padding: '8px 14px', color: C.muted}}>Shorter</div>
								<div style={{padding: '8px 14px', color: C.muted}}>Fix grammar</div>
							</div>
						</div>
						<div
							style={{
								marginTop: 18,
								display: 'inline-flex',
								alignItems: 'center',
								gap: 10,
								padding: '16px 28px',
								borderRadius: 10,
								background: C.flare,
								color: '#fff',
								fontSize: 24,
								fontWeight: 500,
								transform: `scale(${btn}) translateY(${(1 - btn) * -20}px)`,
								transformOrigin: '0 50%',
								opacity: Math.min(1, btn * 2),
							}}
						>
							Build your first workflow
							<Icon d={ICON.arrow} size={22} color="#fff" />
						</div>
					</div>
					<div style={{padding: '14px 44px', borderTop: `1.5px solid ${C.border}`, fontFamily: MONO, fontSize: 18, color: C.muted}}>
						{words} words · 1 min read
					</div>
				</div>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						display: 'flex',
						alignItems: 'center',
						gap: 16,
						padding: '0 18px',
						opacity: nodeIn,
					}}
				>
					<div style={{width: 52, height: 52, borderRadius: 12, background: C.soft, display: 'grid', placeItems: 'center'}}>
						<Icon d={n.icon} size={26} color={C.ink} />
					</div>
					<div>
						<div style={{fontSize: 24, fontWeight: 600, color: C.ink, letterSpacing: '-0.01em'}}>{n.title}</div>
						<div style={{fontSize: 18, color: C.muted}}>{n.sub}</div>
					</div>
				</div>
			</div>
			{t > 3.1 && t < 4.6 ? (
				<Cursor x={lerp(cur, 820, 512)} y={lerp(cur, 820, 500)} scale={1.2} press={press} />
			) : null}
		</AbsoluteFill>
	);
};
