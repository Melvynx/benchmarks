import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, E, FPS, pr} from './lib';

const hatch = 'repeating-linear-gradient(135deg, rgba(26,22,20,0.075) 0 1.2px, transparent 1.2px 12px)';

export const RAIL = 72;

// Paper backdrop with the hatched side rails of lumail.io
export const Background: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const k = pr(t, 0.05, 0.9, E.out);
  const rail = (side: 'left' | 'right') => (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side]: 0,
        width: RAIL,
        background: hatch,
        [side === 'left' ? 'borderRight' : 'borderLeft']: `1px solid ${C.border}`,
        transform: `scaleY(${k})`,
        transformOrigin: side === 'left' ? 'center top' : 'center bottom',
      }}
    />
  );
  return (
    <AbsoluteFill style={{background: C.paper}}>
      {rail('left')}
      {rail('right')}
    </AbsoluteFill>
  );
};
