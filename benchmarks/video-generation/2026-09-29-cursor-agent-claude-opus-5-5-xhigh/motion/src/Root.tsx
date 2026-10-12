import {Composition} from 'remotion';
import {Main} from './Main';
import {FPS, H, W} from './lib';
import timeline from './timeline.json';

export const Root: React.FC = () => (
  <Composition
    id="LumailLaunch"
    component={Main}
    durationInFrames={timeline.duration * FPS}
    fps={FPS}
    width={W}
    height={H}
  />
);
