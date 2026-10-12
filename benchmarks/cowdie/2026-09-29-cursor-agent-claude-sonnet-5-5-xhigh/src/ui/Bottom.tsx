import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ACCESSORIES, FOODS, FOOD_BY_ID, STUFFED_AT, type AccessoryId } from '../game/config';
import { bus } from '../game/bus';
import { levelInfo } from '../game/logic';
import { useGame } from '../game/store';
import { foodThumbnails } from '../three/Foods';
import { worldRef } from '../worldRef';
import { sfx } from '../audio/sfx';
import {
  IconCheck,
  IconClose,
  IconCrown,
  IconFeed,
  IconFlower,
  IconHat,
  IconHeart,
  IconLock,
  IconMoon,
  IconPlay,
  IconShades,
  IconSun,
  IconWash,
} from './icons';

const say = (text: string) => bus.emit('say', { text });

function FoodTray() {
  const { favorite, favoriteKnown, fullness, eating } = useGame(
    useShallow((g) => ({ favorite: g.favorite, favoriteKnown: g.favoriteKnown, fullness: g.fullness, eating: g.eating })),
  );
  const thumbs = useMemo(() => foodThumbnails(), []);
  const stuffed = fullness >= STUFFED_AT;
  return (
    <div className="tray panel" role="group" aria-label="Food">
      <div className="tray-cards">
        {FOODS.map((f) => (
          <button
            key={f.id}
            className={`food-card${eating ? ' is-busy' : ''}${stuffed ? ' is-full' : ''}`}
            data-food={f.id}
            aria-label={`Feed ${f.name}. Belly plus ${f.fullness}, joy plus ${f.joy}. Drag to Cowdie or press to throw.`}
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse' && e.button !== 0) return;
              e.preventDefault();
              worldRef.current?.beginFoodDrag(f.id, e);
            }}
            onClick={(e) => {
              if (e.detail === 0) worldRef.current?.feedNow(f.id);
            }}
          >
            {favoriteKnown && favorite === f.id && (
              <span className="fav-badge" title="Cowdie's favorite">
                <IconHeart size={14} />
              </span>
            )}
            <img src={thumbs[f.id]} alt="" draggable={false} />
            <span className="food-name">{f.name}</span>
            <span className="food-stats">
              <b>+{f.fullness}</b> belly
            </span>
          </button>
        ))}
      </div>
      <p className="tray-hint">
        {stuffed ? 'Cowdie is stuffed. Try again in a bit!' : 'Drag a snack to Cowdie’s mouth, or just tap it.'}
      </p>
    </div>
  );
}

const ACC_ICONS: Record<AccessoryId, typeof IconHat> = {
  flowers: IconFlower,
  party: IconHat,
  shades: IconShades,
  crown: IconCrown,
};

function Wardrobe() {
  const { xp, worn } = useGame(useShallow((g) => ({ xp: g.xp, worn: g.worn })));
  const wear = useGame((g) => g.wear);
  const setPanel = useGame((g) => g.setPanel);
  const { level } = levelInfo(xp);
  return (
    <div className="tray panel wardrobe" role="group" aria-label="Wardrobe">
      <div className="tray-title">
        <strong>Wardrobe</strong>
        <button className="mini-btn" aria-label="Close wardrobe" onClick={() => setPanel('none')}>
          <IconClose size={16} />
        </button>
      </div>
      <div className="tray-cards">
        {ACCESSORIES.map((a) => {
          const locked = level < a.level;
          const active = worn === a.id;
          const Ico = ACC_ICONS[a.id];
          return (
            <button
              key={a.id}
              className={`acc-card${active ? ' active' : ''}${locked ? ' locked' : ''}`}
              disabled={locked}
              aria-pressed={active}
              aria-label={locked ? `${a.name}, unlocks at level ${a.level}` : `${a.name}${active ? ', worn' : ''}`}
              onClick={() => wear(active ? null : a.id)}
            >
              <span className="acc-icon">{locked ? <IconLock size={26} /> : <Ico size={28} />}</span>
              <span className="food-name">{a.name}</span>
              <span className="food-stats">{locked ? `Level ${a.level}` : active ? 'Wearing' : 'Tap to wear'}</span>
              {active && (
                <span className="fav-badge on">
                  <IconCheck size={14} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatAge(born: number) {
  const mins = Math.max(0, Math.floor((Date.now() - born) / 60000));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} h`;
  return `${Math.floor(hrs / 24)} days`;
}

function MenuPanel() {
  const { born, meals, favorite, favoriteKnown, xp, muted } = useGame(
    useShallow((g) => ({ born: g.born, meals: g.meals, favorite: g.favorite, favoriteKnown: g.favoriteKnown, xp: g.xp, muted: g.muted })),
  );
  const reset = useGame((g) => g.reset);
  const setPanel = useGame((g) => g.setPanel);
  const toggleMuted = useGame((g) => g.toggleMuted);
  const [confirm, setConfirm] = useState(false);
  const { level } = levelInfo(xp);
  return (
    <div className="tray panel menu" role="group" aria-label="Menu">
      <div className="tray-title">
        <strong>About Cowdie</strong>
        <button className="mini-btn" aria-label="Close menu" onClick={() => setPanel('none')}>
          <IconClose size={16} />
        </button>
      </div>
      <dl className="facts">
        <div>
          <dt>Age</dt>
          <dd>{formatAge(born)}</dd>
        </div>
        <div>
          <dt>Level</dt>
          <dd>{level}</dd>
        </div>
        <div>
          <dt>Meals</dt>
          <dd>{meals}</dd>
        </div>
        <div>
          <dt>Favorite</dt>
          <dd>{favoriteKnown ? FOOD_BY_ID[favorite].name : 'Try every snack!'}</dd>
        </div>
      </dl>
      <div className="menu-actions">
        <button className="text-btn" onClick={toggleMuted}>
          Sound: {muted ? 'off' : 'on'}
        </button>
        {confirm ? (
          <>
            <button
              className="text-btn danger"
              onClick={() => {
                reset();
                setConfirm(false);
              }}
            >
              Yes, start over
            </button>
            <button className="text-btn" onClick={() => setConfirm(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className="text-btn" onClick={() => setConfirm(true)}>
            Reset Cowdie
          </button>
        )}
      </div>
      <p className="tray-hint">
        Tip: boop her nose, scratch her head, tap little messes to clean them. She never runs away, but she does get grumpy.
      </p>
    </div>
  );
}

function WashHint() {
  const progress = useGame((g) => g.washProgress);
  const setMode = useGame((g) => g.setMode);
  return (
    <div className="tray panel hint" role="status">
      <div className="hint-text">
        <strong>Bath time</strong>
        <span>Rub the sponge all over Cowdie to make her squeaky clean.</span>
        <div className="progress" role="progressbar" aria-label="Bath progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
      <button className="text-btn" onClick={() => setMode('idle')}>
        Done
      </button>
    </div>
  );
}

function PlayHint() {
  const setMode = useGame((g) => g.setMode);
  const energy = useGame((g) => g.energy);
  return (
    <div className="tray panel hint" role="status">
      <div className="hint-text">
        <strong>Ball time</strong>
        <span>Tap anywhere on the meadow to throw the ball. Cowdie will chase it! {energy < 30 ? 'She is getting tired.' : ''}</span>
      </div>
      <button className="text-btn" onClick={() => setMode('idle')}>
        Done
      </button>
    </div>
  );
}

function SleepHint() {
  const energy = useGame((g) => g.energy);
  const wake = useGame((g) => g.wake);
  return (
    <div className="tray panel hint" role="status">
      <div className="hint-text">
        <strong>Cowdie is sleeping</strong>
        <span>Energy is recovering. She wakes up on her own when rested.</span>
        <div className="progress energy" role="progressbar" aria-label="Energy" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(energy)}>
          <div style={{ width: `${Math.round(energy)}%` }} />
        </div>
      </div>
      <button className="text-btn" onClick={() => wake('manual')}>
        Wake up
      </button>
    </div>
  );
}

interface DockBtnProps {
  label: string;
  hotkey: string;
  color: string;
  pressed?: boolean;
  dim?: boolean;
  onClick: () => void;
  children: ReactNode;
  testId: string;
}

function DockBtn({ label, hotkey, color, pressed, dim, onClick, children, testId }: DockBtnProps) {
  return (
    <button
      className={`dock-btn${dim ? ' dim' : ''}`}
      style={{ ['--c' as string]: color }}
      aria-pressed={pressed}
      aria-keyshortcuts={hotkey.toUpperCase()}
      data-action={testId}
      onClick={() => {
        sfx.unlock();
        sfx.click();
        onClick();
      }}
    >
      <span className="dock-icon">{children}</span>
      <span className="dock-label">{label}</span>
      <kbd aria-hidden="true">{hotkey}</kbd>
    </button>
  );
}

export function BottomBar() {
  const { mode, panel, sleeping } = useGame(useShallow((g) => ({ mode: g.mode, panel: g.panel, sleeping: g.sleeping })));
  const setMode = useGame((g) => g.setMode);
  const togglePanel = useGame((g) => g.togglePanel);
  const setPanel = useGame((g) => g.setPanel);

  const feed = () => {
    if (sleeping) return say('Shh... Cowdie is sleeping.');
    if (mode !== 'idle') setMode('idle');
    togglePanel('feed');
  };
  const play = () => {
    if (sleeping) return say('Shh... Cowdie is sleeping.');
    setMode(mode === 'play' ? 'idle' : 'play');
  };
  const wash = () => {
    if (sleeping) return say('Shh... Cowdie is sleeping.');
    setMode(mode === 'wash' ? 'idle' : 'wash');
  };
  const sleep = () => {
    const g = useGame.getState();
    if (g.sleeping) g.wake('manual');
    else g.requestSleep();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'f') feed();
      else if (k === 'p') play();
      else if (k === 'w') wash();
      else if (k === 's') sleep();
      else if (k === 'escape') {
        setPanel('none');
        if (useGame.getState().mode !== 'idle') setMode('idle');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  let tray: ReactNode = null;
  if (panel === 'menu') tray = <MenuPanel />;
  else if (panel === 'wardrobe') tray = <Wardrobe />;
  else if (mode === 'wash') tray = <WashHint />;
  else if (mode === 'play') tray = <PlayHint />;
  else if (sleeping) tray = <SleepHint />;
  else if (panel === 'feed') tray = <FoodTray />;

  return (
    <footer className="hud-bottom" data-hud="bottom">
      {tray}
      <nav className="panel dock" aria-label="Care actions" data-hud="dock">
        <DockBtn label="Feed" hotkey="F" color="#ff8a5b" pressed={panel === 'feed' && !sleeping} dim={sleeping} onClick={feed} testId="feed">
          <IconFeed size={30} />
        </DockBtn>
        <DockBtn label="Play" hotkey="P" color="#ff5c8a" pressed={mode === 'play'} dim={sleeping} onClick={play} testId="play">
          <IconPlay size={30} />
        </DockBtn>
        <DockBtn label="Wash" hotkey="W" color="#2fb1f5" pressed={mode === 'wash'} dim={sleeping} onClick={wash} testId="wash">
          <IconWash size={30} />
        </DockBtn>
        <DockBtn label={sleeping ? 'Wake' : 'Sleep'} hotkey="S" color="#7b6cf0" pressed={sleeping} onClick={sleep} testId="sleep">
          {sleeping ? <IconSun size={30} /> : <IconMoon size={30} />}
        </DockBtn>
      </nav>
    </footer>
  );
}
