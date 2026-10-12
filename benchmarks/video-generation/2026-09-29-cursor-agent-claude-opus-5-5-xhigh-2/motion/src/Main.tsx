import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {C, FONT, FPS, SCENES} from './theme';
import {GlobalChrome, GlobalNav} from './chrome';
import {Intro} from './scenes/Intro';
import {Problem} from './scenes/Problem';
import {Hero} from './scenes/Hero';
import {Agent} from './scenes/Agent';
import {Editor} from './scenes/Editor';
import {Workflow} from './scenes/Workflow';
import {Transactional} from './scenes/Transactional';
import {Pricing} from './scenes/Pricing';
import {Outro} from './scenes/Outro';

const Seq: React.FC<{
	range: readonly [number, number];
	children: React.ReactNode;
	name: string;
}> = ({range, children, name}) => (
	<Sequence
		name={name}
		from={Math.round(range[0] * FPS)}
		durationInFrames={Math.round((range[1] - range[0]) * FPS)}
	>
		{children}
	</Sequence>
);

// Stacking order is chosen per transition: the outgoing layer sits on top when
// it performs the reveal (curtain, card shrink), the incoming one when it does.
export const Main: React.FC = () => (
	<AbsoluteFill style={{background: C.paper, fontFamily: FONT, overflow: 'hidden'}}>
		<GlobalChrome />
		<Seq name="Intro" range={SCENES.intro}>
			<Intro />
		</Seq>
		<Seq name="Hero" range={SCENES.hero}>
			<Hero />
		</Seq>
		<Seq name="Agent" range={SCENES.agent}>
			<Agent />
		</Seq>
		<Seq name="Workflow" range={SCENES.workflow}>
			<Workflow />
		</Seq>
		<Seq name="Editor" range={SCENES.editor}>
			<Editor />
		</Seq>
		<Seq name="Pricing" range={SCENES.pricing}>
			<Pricing />
		</Seq>
		<GlobalNav />
		<Seq name="Problem" range={SCENES.problem}>
			<Problem />
		</Seq>
		<Seq name="Transactional" range={SCENES.transactional}>
			<Transactional />
		</Seq>
		<Seq name="Outro" range={SCENES.outro}>
			<Outro />
		</Seq>
	</AbsoluteFill>
);
