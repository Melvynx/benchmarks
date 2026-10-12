import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {Background} from './Background';
import {Hud} from './Hud';
import {FPS} from './lib';
import {Agent} from './scenes/Agent';
import {Editor} from './scenes/Editor';
import {End} from './scenes/End';
import {Migrate} from './scenes/Migrate';
import {Pricing} from './scenes/Pricing';
import {Problem} from './scenes/Problem';
import {Reveal} from './scenes/Reveal';
import {Transactional} from './scenes/Transactional';
import {Workflow} from './scenes/Workflow';
import timeline from './timeline.json';

type SceneName = keyof typeof timeline.scenes;

const Inner: React.FC<{pre: number; Scene: React.FC<{t: number}>}> = ({pre, Scene}) => {
  const frame = useCurrentFrame();
  return <Scene t={frame / FPS - pre} />;
};

// Mounts a scene over its timeline slot; `pre`/`post` add overlap for transitions
const Slot: React.FC<{name: SceneName; Scene: React.FC<{t: number}>; pre?: number; post?: number}> = ({
  name,
  Scene,
  pre = 0,
  post = 0,
}) => {
  const [a, b] = timeline.scenes[name];
  return (
    <Sequence
      name={name}
      from={Math.round((a - pre) * FPS)}
      durationInFrames={Math.round((b - a + pre + post) * FPS)}
    >
      <Inner pre={pre} Scene={Scene} />
    </Sequence>
  );
};

export const Main: React.FC = () => (
  <AbsoluteFill style={{background: '#f8f7f4'}}>
    <Background />
    <Slot name="problem" Scene={Problem} />
    <Slot name="reveal" Scene={Reveal} />
    <Slot name="agent" Scene={Agent} />
    <Slot name="editor" Scene={Editor} />
    <Slot name="workflow" Scene={Workflow} pre={0.4} />
    <Slot name="pricing" Scene={Pricing} pre={0.5} />
    <Slot name="transactional" Scene={Transactional} pre={0.5} />
    <Slot name="migrate" Scene={Migrate} />
    <Slot name="end" Scene={End} />
    <Hud />
  </AbsoluteFill>
);
