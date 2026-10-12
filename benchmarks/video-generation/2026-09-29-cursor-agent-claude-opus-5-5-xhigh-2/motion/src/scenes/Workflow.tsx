import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, SHADOW_CARD} from '../theme';
import {Badge, E, Icon, ICON, lerp, sp, tw, useT, Words} from '../lib';
import {NODE_H, NODE_W, NODES, ROW_Y} from '../layout';

const AV_COLORS = ['#ff633d', '#5b9cf0', '#3fbd87', '#e0a04a', '#a08ce8', '#d9628a', '#1a1614'];
const INITIALS = ['MK', 'JL', 'AS', 'TR', 'NB', 'EV', 'YO', 'CD', 'LP', 'RG', 'HS', 'OM', 'PB', 'KF'];

type Pt = [number, number];

const pathFor = (yes: boolean): Pt[] => {
	const b = NODES[yes ? 4 : 5];
	return [
		[196, ROW_Y],
		[NODES[3].x + NODE_W, ROW_Y],
		[NODES[3].x + NODE_W + 60, ROW_Y],
		[b.x - 10, b.y],
		[b.x + 60, b.y],
	];
};

const along = (pts: Pt[], d: number): Pt | null => {
	let acc = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const [x0, y0] = pts[i];
		const [x1, y1] = pts[i + 1];
		const len = Math.hypot(x1 - x0, y1 - y0);
		if (d <= acc + len) {
			const f = (d - acc) / len;
			return [lerp(f, x0, x1), lerp(f, y0, y1)];
		}
		acc += len;
	}
	return null;
};

const SPAWN0 = 1.55;
const SPAWN_EVERY = 0.3;
const SPEED = 760;

export const Workflow: React.FC = () => {
	const t = useT();
	const canvas = tw(t, 0.05, 0.55, E.out);
	const draw = tw(t, 0.6, 1.25, E.inOut);
	const live = tw(t, 1.3, 1.5, E.inOut);

	const avatars = new Array(14).fill(0).map((_, i) => {
		const born = SPAWN0 + i * SPAWN_EVERY;
		if (t < born) return null;
		const yes = i % 3 !== 2;
		const pts = pathFor(yes);
		const p = along(pts, (t - born) * SPEED);
		return {i, yes, p, born};
	});

	const hot = (idx: number) => {
		const n = NODES[idx];
		const w = n.w ?? NODE_W;
		let h = 0;
		for (const a of avatars) {
			if (!a || !a.p) continue;
			const [x, y] = a.p;
			if (x > n.x - 20 && x < n.x + w + 20 && Math.abs(y - n.y) < NODE_H / 2 + 10) h = 1;
		}
		return h;
	};

	const arrivals = (yes: boolean) =>
		avatars.filter((a) => a && a.yes === yes && !a.p).length;

	const curve = (to: (typeof NODES)[number]) => {
		const x0 = NODES[3].x + NODE_W;
		const x1 = to.x;
		const mx = (x0 + x1) / 2;
		return `M ${x0} ${ROW_Y} C ${mx} ${ROW_Y}, ${mx} ${to.y}, ${x1} ${to.y}`;
	};

	return (
		<AbsoluteFill style={{fontFamily: FONT}}>
			<div style={{position: 'absolute', left: 150, top: 148}}>
				<div style={{opacity: tw(t, 0.3, 0.6)}}>
					<Badge scale={1.2}>Workflows</Badge>
				</div>
				<div style={{marginTop: 22, fontSize: 84, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1.05, color: C.ink}}>
					<Words text="Sequences that keep running" t={t} start={0.35} />
				</div>
			</div>
			<div
				style={{
					position: 'absolute',
					left: 1290,
					top: 196,
					width: 480,
					fontSize: 26,
					lineHeight: 1.5,
					color: C.muted,
					opacity: tw(t, 0.7, 1.1),
				}}
			>
				Welcome, launch, follow-up. Publish once. Lumail handles enrolment, timing, and exits.
			</div>

			<div
				style={{
					position: 'absolute',
					left: 140,
					top: 368,
					width: 1640,
					height: 622,
					borderRadius: 28,
					background: C.wash,
					opacity: canvas,
					transform: `scale(${lerp(canvas, 0.97, 1)})`,
				}}
			>
				<div
					style={{
						position: 'absolute',
						inset: 30,
						borderRadius: 18,
						background: C.card,
						border: `1.5px solid ${C.border}`,
						boxShadow: SHADOW_CARD,
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 10,
							height: 60,
							padding: '0 24px',
							borderBottom: `1.5px solid ${C.border}`,
							fontFamily: MONO,
							fontSize: 20,
							color: C.muted,
						}}
					>
						{[0, 1, 2].map((i) => (
							<span key={i} style={{width: 12, height: 12, borderRadius: 9, background: '#dcd7d0'}} />
						))}
						<span style={{marginLeft: 12}}>Welcome sequence</span>
						<span style={{flex: 1}} />
						<span style={{fontFamily: MONO, fontSize: 18, color: C.muted, marginRight: 14}}>
							{live > 0.5 ? `${Math.max(0, avatars.filter(Boolean).length)} active runs` : 'draft · v3'}
						</span>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								padding: '6px 16px',
								borderRadius: 999,
								fontFamily: FONT,
								fontSize: 19,
								fontWeight: 500,
								background: live > 0.5 ? 'rgba(31,158,99,0.12)' : C.ink,
								color: live > 0.5 ? C.green : '#fff',
								transform: `scale(${1 + Math.sin(live * Math.PI) * 0.12})`,
							}}
						>
							{live > 0.5 ? (
								<>
									<span style={{width: 8, height: 8, borderRadius: 9, background: C.green, boxShadow: `0 0 0 ${3 + Math.sin(t * 8) * 2}px rgba(31,158,99,0.2)`}} />
									Live
								</>
							) : (
								'Publish'
							)}
						</div>
					</div>
					<div
						style={{
							position: 'absolute',
							inset: '61px 0 0 0',
							backgroundImage: `radial-gradient(${C.border} 1.6px, transparent 1.6px)`,
							backgroundSize: '28px 28px',
							backgroundPosition: `${-t * 10}px 0`,
						}}
					/>
				</div>
			</div>

			<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
				{[0, 1, 2].map((i) => {
					const x0 = NODES[i].x + NODE_W;
					const x1 = NODES[i + 1].x;
					const p = tw(draw, i / 4, (i + 1) / 4, (n) => n);
					return (
						<line key={i} x1={x0} y1={ROW_Y} x2={lerp(p, x0, x1)} y2={ROW_Y} stroke="#cfc8bf" strokeWidth={2.5} />
					);
				})}
				{[4, 5].map((k) => (
					<path
						key={k}
						d={curve(NODES[k])}
						fill="none"
						stroke="#cfc8bf"
						strokeWidth={2.5}
						pathLength={1}
						strokeDasharray={1}
						strokeDashoffset={1 - tw(draw, 0.72, 1, (n) => n)}
					/>
				))}
			</svg>

			{avatars.map((a) => {
				if (!a || !a.p) return null;
				const [x, y] = a.p;
				const s = tw(t, a.born, a.born + 0.2, E.out);
				return (
					<div
						key={a.i}
						style={{
							position: 'absolute',
							left: x - 20,
							top: y - 20,
							width: 40,
							height: 40,
							borderRadius: 99,
							background: AV_COLORS[a.i % AV_COLORS.length],
							border: '3px solid #fff',
							boxShadow: '0 4px 10px rgba(26,22,20,0.2)',
							color: '#fff',
							fontSize: 14,
							fontWeight: 600,
							display: 'grid',
							placeItems: 'center',
							transform: `scale(${s})`,
						}}
					>
						{INITIALS[a.i]}
					</div>
				);
			})}

			{NODES.map((n, i) => {
				const order = [1, 0, 2, 3, 4, 5][i];
				const p = i === 1 ? (t >= 0.5 ? 1 : 0) : sp(t, 0.42 + order * 0.08, {damping: 13, stiffness: 180, mass: 0.7});
				const h = hot(i);
				const w = n.w ?? NODE_W;
				const count = i >= 4 ? arrivals(i === 4) : 0;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: n.x,
							top: n.y - NODE_H / 2,
							width: w,
							height: NODE_H,
							boxSizing: 'border-box',
							background: C.card,
							border: `${h ? 2 : 1.5}px solid ${h ? C.flare : C.border}`,
							borderRadius: 14,
							display: 'flex',
							alignItems: 'center',
							gap: 16,
							padding: '0 18px',
							boxShadow: h ? '0 0 0 6px rgba(255,51,0,0.1), 0 10px 24px -12px rgba(26,22,20,0.25)' : '0 8px 20px -14px rgba(26,22,20,0.25)',
							transform: `scale(${p * (1 + h * 0.03)})`,
						}}
					>
						<div style={{width: 52, height: 52, borderRadius: 12, background: h ? C.blush : C.soft, display: 'grid', placeItems: 'center'}}>
							<Icon d={n.icon} size={26} color={h ? C.flare : C.ink} style={i === 2 && h ? {transform: `rotate(${t * 720}deg)`} : undefined} />
						</div>
						<div style={{flex: 1}}>
							<div style={{fontSize: 24, fontWeight: 600, color: C.ink, letterSpacing: '-0.01em'}}>{n.title}</div>
							<div style={{fontSize: 18, color: C.muted}}>{n.sub}</div>
						</div>
						{i >= 4 && count > 0 ? (
							<div
								style={{
									minWidth: 36,
									height: 30,
									padding: '0 8px',
									borderRadius: 99,
									background: i === 4 ? 'rgba(31,158,99,0.12)' : C.blush,
									color: i === 4 ? C.green : C.flare,
									fontFamily: MONO,
									fontSize: 17,
									display: 'grid',
									placeItems: 'center',
								}}
							>
								{count}
							</div>
						) : null}
					</div>
				);
			})}

			{[4, 5].map((k) => {
				const yes = k === 4;
				const n = NODES[k];
				const p = sp(t, 1.05 + (yes ? 0 : 0.08));
				const x = (NODES[3].x + NODE_W + n.x) / 2;
				const y = (ROW_Y + n.y) / 2;
				return (
					<div
						key={k}
						style={{
							position: 'absolute',
							left: x,
							top: y,
							transform: `translate(-50%,-50%) scale(${p})`,
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							padding: '6px 14px',
							borderRadius: 10,
							background: C.card,
							border: `1.5px solid ${C.border}`,
							fontSize: 19,
							fontWeight: 500,
							color: C.ink,
						}}
					>
						<span style={{width: 8, height: 8, borderRadius: 9, background: yes ? C.green : C.flare}} />
						{yes ? 'Yes' : 'No'}
					</div>
				);
			})}
		</AbsoluteFill>
	);
};
