import type { ComponentType } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { STAT_META, type StatKey } from '../game/config';
import { levelInfo, stageName } from '../game/logic';
import { useGame } from '../game/store';
import { sfx } from '../audio/sfx';
import { IconBolt, IconDrop, IconFeed, IconHat, IconHeart, IconMenu, IconMute, IconSound } from './icons';

const METER_ICONS: Record<StatKey, ComponentType<{ size?: number }>> = {
  fullness: IconFeed,
  joy: IconHeart,
  energy: IconBolt,
  clean: IconDrop,
};

const METER_COLORS: Record<StatKey, string> = {
  fullness: '#ff8a5b',
  joy: '#ff5c8a',
  energy: '#ffbf1f',
  clean: '#3fb8ff',
};

function Meter({ k, value }: { k: StatKey; value: number }) {
  const Ico = METER_ICONS[k];
  const low = value < 25;
  return (
    <div
      className={`meter${low ? ' low' : ''}`}
      style={{ ['--c' as string]: METER_COLORS[k] }}
      role="meter"
      aria-label={STAT_META[k].label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      data-stat={k}
    >
      <span className="meter-icon">
        <Ico size={18} />
      </span>
      <div className="meter-body">
        <div className="meter-label">
          <span>{STAT_META[k].label}</span>
          <span className="meter-value">{Math.round(value)}</span>
        </div>
        <div className="meter-bar">
          <div className="meter-fill" style={{ width: `${Math.max(2, value)}%` }} />
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const s = useGame(useShallow((g) => ({ fullness: g.fullness, joy: g.joy, energy: g.energy, clean: g.clean })));
  return (
    <section className="panel stats" aria-label="Cowdie's needs">
      {(['fullness', 'joy', 'energy', 'clean'] as StatKey[]).map((k) => (
        <Meter key={k} k={k} value={s[k]} />
      ))}
    </section>
  );
}

function PetCard() {
  const xp = useGame((g) => g.xp);
  const sleeping = useGame((g) => g.sleeping);
  const { level, into, need } = levelInfo(xp);
  const pct = Math.min(1, into / need);
  const R = 19;
  const C = 2 * Math.PI * R;
  return (
    <div className="panel pet-card" aria-label={`Cowdie, level ${level}`}>
      <div className="level-ring" data-level={level}>
        <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
          <circle cx="24" cy="24" r={R} className="ring-bg" />
          <circle
            cx="24"
            cy="24"
            r={R}
            className="ring-fg"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            transform="rotate(-90 24 24)"
          />
        </svg>
        <span>{level}</span>
      </div>
      <div className="pet-meta">
        <strong className="pet-name">Cowdie</strong>
        <span className="pet-stage">
          {stageName(level)}
          {sleeping ? ' · asleep' : ''}
        </span>
        <span className="pet-xp">
          {Math.floor(into)} / {need} XP
        </span>
      </div>
    </div>
  );
}

export function TopBar() {
  const muted = useGame((g) => g.muted);
  const panel = useGame((g) => g.panel);
  const toggleMuted = useGame((g) => g.toggleMuted);
  const togglePanel = useGame((g) => g.togglePanel);
  return (
    <header className="hud-top" data-hud="top">
      <div className="top-left">
        <h1 className="title">Claude Sonnet 5.5</h1>
        <PetCard />
      </div>
      <Stats />
      <div className="top-right">
        <button
          className="round-btn"
          aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          aria-pressed={!muted}
          onClick={() => {
            toggleMuted();
            window.setTimeout(() => sfx.click(), 30);
          }}
          title={muted ? 'Sound off' : 'Sound on'}
        >
          {muted ? <IconMute /> : <IconSound />}
        </button>
        <button
          className="round-btn"
          aria-label="Wardrobe"
          aria-pressed={panel === 'wardrobe'}
          onClick={() => {
            sfx.click();
            togglePanel('wardrobe');
          }}
          title="Wardrobe"
        >
          <IconHat />
        </button>
        <button
          className="round-btn"
          aria-label="Menu"
          aria-pressed={panel === 'menu'}
          onClick={() => {
            sfx.click();
            togglePanel('menu');
          }}
          title="Menu"
        >
          <IconMenu />
        </button>
      </div>
    </header>
  );
}
