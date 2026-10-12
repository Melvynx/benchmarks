import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Background, SceneShell, Wipe } from "./components";
import { Hero, Intro, Problem } from "./scenes1";
import { Agent, Migrate, Workflow } from "./scenes2";
import { Outro, Pricing, Transactional } from "./scenes3";

const scenes: { C: React.FC; d: number }[] = [
  { C: Intro, d: 120 },
  { C: Problem, d: 150 },
  { C: Hero, d: 165 },
  { C: Agent, d: 210 },
  { C: Migrate, d: 165 },
  { C: Workflow, d: 150 },
  { C: Transactional, d: 135 },
  { C: Pricing, d: 135 },
  { C: Outro, d: 120 },
];

export const TOTAL = scenes.reduce((a, s) => a + s.d, 0);

const starts = scenes.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + scenes[i - 1].d);
  return acc;
}, []);

const wipes = [starts[1], starts[3], starts[5], starts[8]];

export const Video: React.FC = () => (
  <AbsoluteFill>
    <Background />
    {scenes.map(({ C, d }, i) => (
      <Sequence key={i} from={starts[i]} durationInFrames={d}>
        <SceneShell duration={d} exit={i === scenes.length - 1 ? 0 : 9}>
          <C />
        </SceneShell>
      </Sequence>
    ))}
    {wipes.map((w) => (
      <Wipe key={w} at={w} />
    ))}
  </AbsoluteFill>
);
