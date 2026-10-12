import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {DURATION_S, FPS, H, W} from './theme';

export const Root: React.FC = () => (
	<Composition
		id="LumailLaunch"
		component={Main}
		durationInFrames={DURATION_S * FPS}
		fps={FPS}
		width={W}
		height={H}
	/>
);
