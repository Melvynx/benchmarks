import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Lockup} from './components';
import {C, E, FPS, colorMix, mono, pr, tw} from './lib';

const chapters: [number, string, string][] = [
  [11, '01', 'Agents'],
  [17, '02', 'Editor'],
  [23, '03', 'Workflows'],
  [29, '04', 'Transactional'],
  [34, '05', 'Pricing'],
  [39, '06', 'Migrate'],
];

// Top bar: lockup, hairline, and a rolling chapter label
export const Hud: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const show = pr(t, 11.05, 0.7, E.out) * (1 - pr(t, 41.35, 0.45, E.in));
  if (show <= 0) return null;
  const dark = tw(t, 28.9, 29.0, 0, 1, E.linear) * (1 - tw(t, 33.9, 34.0, 0, 1, E.linear));
  const fg = colorMix(C.ink, C.white, dark);
  const line = dark > 0.5 ? 'rgba(255,255,255,0.1)' : C.border;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          opacity: show,
          transform: `translateY(${(1 - show) * -16}px)`,
        }}
      >
        <Lockup size={38} color={fg} />
        <div style={{flex: 1}} />
        <div style={{position: 'relative', height: 30, width: 420, overflow: 'hidden'}}>
          {chapters.map(([start, num, label], i) => {
            const next = chapters[i + 1]?.[0] ?? 99;
            const kin = pr(t, start - 0.05, 0.55, E.out);
            const kout = pr(t, next - 0.2, 0.4, E.in);
            if (t < start - 0.1 || t > next + 0.3) return null;
            return (
              <div
                key={num}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  fontFamily: mono,
                  fontSize: 20,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: fg,
                  transform: `translateY(${(1 - kin) * 30 - kout * 30}px)`,
                  opacity: kin * (1 - kout),
                }}
              >
                <span style={{width: 8, height: 8, borderRadius: 8, background: C.flare}} />
                <span style={{opacity: 0.55}}>{num}</span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          top: 112,
          height: 1,
          background: line,
          transform: `scaleX(${show})`,
          transformOrigin: 'left center',
        }}
      />
    </AbsoluteFill>
  );
};
