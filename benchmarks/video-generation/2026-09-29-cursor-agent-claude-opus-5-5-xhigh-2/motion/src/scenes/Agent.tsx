import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO, SHADOW_CARD} from '../theme';
import {
	Badge,
	Cursor,
	E,
	fmt,
	ICON,
	Icon,
	lerp,
	sp,
	SPRING_SOFT,
	tw,
	typed,
	useT,
	WashCard,
	WindowBar,
	Words,
} from '../lib';

const AGENTS = ['ChatGPT', 'Claude', 'Claude Code', 'Cursor', 'Codex', 'Hermes', 'OpenClaw'];

const TOOLS = [
	{at: 2.1, res: 2.45, name: 'query_subscribers', arg: '(clicked: "/pricing")', out: 'subscribers'},
	{at: 2.7, res: 3.05, name: 'bulk_add_tags', arg: '(tags: ["hot-lead"])', out: 'tagged'},
	{at: 3.3, res: 3.65, name: 'add_subscriber_to_workflow', arg: '(workflow: "Objections")', out: 'enrolled'},
];

const Dot: React.FC<{running: boolean; done: boolean; t: number}> = ({running, done, t}) => (
	<span
		style={{
			width: 11,
			height: 11,
			borderRadius: 99,
			flexShrink: 0,
			marginTop: 13,
			background: done ? C.green : running ? (Math.floor(t * 8) % 2 ? C.flare : '#d8d2ca') : C.border,
			boxShadow: done ? '0 0 0 4px rgba(31,158,99,0.14)' : undefined,
		}}
	/>
);

export const Agent: React.FC = () => {
	const t = useT();
	const enter = tw(t, 0, 0.5, E.inOut);
	const whip = tw(t, 6.0, 6.5, E.in);
	const card = sp(t, 0.15, SPRING_SOFT);
	const tools = Math.round(lerp(tw(t, 0.5, 1.4, E.inOut), 0, 126));
	const prompt = typed('who clicked the pricing link but never bought?', t, 0.75, 40);
	const done = typed('Done. The first email goes out in 2 hours.', t, 3.95, 64);
	const gate = sp(t, 4.55, {damping: 16, stiffness: 160, mass: 0.8});
	const cur = tw(t, 4.75, 5.4, E.inOut);
	const press = tw(t, 5.45, 5.52) * (1 - tw(t, 5.55, 5.7));
	const approved = tw(t, 5.58, 5.8, E.inOut);

	return (
		<AbsoluteFill
			style={{
				transform: `translate(${-whip * 1920}px, ${(1 - enter) * 1080}px)`,
				filter: whip > 0 ? `blur(${Math.sin(whip * Math.PI) * 10}px)` : undefined,
			}}
		>
			<div style={{position: 'absolute', left: 150, top: 262, width: 680, fontFamily: FONT}}>
				<div style={{opacity: tw(t, 0.25, 0.6), transform: `translateY(${(1 - tw(t, 0.25, 0.6)) * 16}px)`}}>
					<Badge scale={1.2}>AI</Badge>
				</div>
				<div style={{marginTop: 26, fontSize: 88, fontWeight: 500, lineHeight: 1.04, letterSpacing: '-0.04em', color: C.ink}}>
					<div><Words text="Your AI can send" t={t} start={0.35} /></div>
					<div><Words text="the campaign." t={t} start={0.55} /></div>
				</div>
				<div
					style={{
						marginTop: 30,
						fontSize: 30,
						lineHeight: 1.5,
						color: C.muted,
						opacity: tw(t, 0.8, 1.3),
						transform: `translateY(${(1 - tw(t, 0.8, 1.3)) * 20}px)`,
					}}
				>
					Connect the agent you already use. It drafts, segments, and schedules. You keep the last click.
				</div>
				<div style={{marginTop: 50, fontFamily: MONO, fontSize: 18, letterSpacing: '0.2em', color: C.muted, opacity: tw(t, 1.1, 1.4)}}>
					RUNS INSIDE
				</div>
				<div style={{marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12}}>
					{AGENTS.map((a, i) => {
						const p = sp(t, 1.2 + i * 0.07);
						return (
							<div
								key={a}
								style={{
									transform: `scale(${p}) translateY(${(1 - p) * 20}px)`,
									opacity: Math.min(1, p * 2),
									padding: '10px 20px',
									borderRadius: 999,
									background: C.card,
									border: `1.5px solid ${C.border}`,
									fontSize: 23,
									fontWeight: 500,
									color: C.ink,
									display: 'flex',
									alignItems: 'center',
									gap: 10,
								}}
							>
								<span style={{width: 8, height: 8, borderRadius: 9, background: C.green}} />
								{a}
							</div>
						);
					})}
				</div>
			</div>

			<div
				style={{
					position: 'absolute',
					left: 880,
					top: 150,
					width: 900,
					height: 840,
					transform: `translateY(${(1 - card) * 120}px) rotate(${(1 - card) * 2}deg)`,
					opacity: Math.min(1, card * 1.5),
				}}
			>
				<WashCard pad={34} style={{height: '100%', boxSizing: 'border-box'}} innerStyle={{position: 'relative', boxShadow: SHADOW_CARD}}>
					<WindowBar
						title="claude"
						scale={1.1}
						right={
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 8,
									padding: '5px 14px',
									borderRadius: 8,
									border: `1.5px solid ${C.border}`,
									fontSize: 19,
									color: C.ink,
								}}
							>
								<span style={{width: 8, height: 8, borderRadius: 9, background: C.green}} />
								lumail · {tools} tools
							</div>
						}
					/>
					<div style={{padding: '30px 36px', fontFamily: MONO, fontSize: 23, lineHeight: 1.62, color: C.ink}}>
						<div style={{color: C.ink}}>
							<span style={{color: C.muted}}>{'> '}</span>
							{prompt}
							{t < 2.0 && Math.floor(t * 3) % 2 === 0 ? <span style={{background: C.ink, color: C.ink}}>_</span> : null}
						</div>
						{TOOLS.map((tool, i) => {
							const vis = tw(t, tool.at, tool.at + 0.3);
							if (vis <= 0) return null;
							const resP = tw(t, tool.res, tool.res + 0.35, E.out);
							return (
								<div key={i} style={{marginTop: 18, opacity: vis, transform: `translateY(${(1 - vis) * 14}px)`}}>
									<div style={{display: 'flex', gap: 16}}>
										<Dot running={t < tool.res} done={t >= tool.res} t={t} />
										<div>
											<span style={{fontWeight: 500}}>lumail - {tool.name}</span>
											<span style={{color: C.muted}}> (MCP){tool.arg}</span>
										</div>
									</div>
									{t >= tool.res ? (
										<div style={{paddingLeft: 27, color: C.muted}}>
											⎿&nbsp; {fmt(resP * 312)} {tool.out}
										</div>
									) : null}
								</div>
							);
						})}
						{t >= 3.95 ? (
							<div style={{marginTop: 18, display: 'flex', gap: 16}}>
								<Dot running={false} done t={t} />
								<div>{done}</div>
							</div>
						) : null}
					</div>

					<div
						style={{
							position: 'absolute',
							left: 26,
							right: 26,
							bottom: 26,
							height: 108,
							borderRadius: 16,
							border: `1.5px solid ${approved > 0.5 ? 'rgba(31,158,99,0.4)' : C.border}`,
							background: approved > 0.5 ? '#f1faf5' : C.soft,
							display: 'flex',
							alignItems: 'center',
							padding: '0 22px 0 28px',
							gap: 18,
							fontFamily: FONT,
							transform: `translateY(${(1 - gate) * 160}px)`,
							opacity: Math.min(1, gate * 2),
						}}
					>
						<Icon d={ICON.envelope} size={34} color={C.ink} />
						<div style={{flex: 1}}>
							<div style={{fontSize: 25, fontWeight: 600, color: C.ink, letterSpacing: '-0.01em'}}>
								Schedule “Objections #1”
							</div>
							<div style={{fontSize: 20, color: C.muted, marginTop: 2}}>312 recipients · Thursday 9:00 · waiting for you</div>
						</div>
						<div
							style={{
								position: 'relative',
								width: 190,
								height: 60,
								borderRadius: 999,
								background: approved > 0.5 ? C.green : C.flare,
								color: '#fff',
								fontSize: 23,
								fontWeight: 500,
								display: 'grid',
								placeItems: 'center',
								boxShadow: `inset 0 1px 0 rgba(255,255,255,.34), 0 ${(1 - press) * 4}px 0 ${approved > 0.5 ? '#157a4b' : '#b52a06'}`,
								transform: `translateY(${press * 4}px) scale(${1 + Math.sin(approved * Math.PI) * 0.08})`,
							}}
						>
							{approved > 0.5 ? (
								<span style={{display: 'flex', alignItems: 'center', gap: 8}}>
									<Icon d={ICON.check} size={22} color="#fff" /> Scheduled
								</span>
							) : (
								'Approve'
							)}
						</div>
					</div>
				</WashCard>
			</div>
			{t > 4.7 ? (
				<Cursor x={lerp(cur, 1880, 1612)} y={lerp(cur, 1100, 876)} scale={1.25} press={press} />
			) : null}
		</AbsoluteFill>
	);
};
