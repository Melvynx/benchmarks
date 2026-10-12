import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ACCESSORIES,
  STAGES,
  STAT_META,
  stageIndexFor,
  xpForLevel,
  type StatKey,
} from "../game/content";
import { moodOf, useGame } from "../game/store";
import { floatEls, ui } from "../game/runtime";
import { initAudio, sfx } from "../game/audio";
import { FoodTray } from "./FoodTray";
import { BubbleLayer } from "./PetBubble";
import {
  AccessoryIcon,
  IconBall,
  IconBow,
  IconBubbles,
  IconClose,
  IconCow,
  IconFeed,
  IconGear,
  IconLock,
  IconMoon,
  IconMusic,
  IconPencil,
  IconPill,
  IconPoop,
  IconSound,
  IconStar,
  IconSun,
  STAT_ICON,
} from "./icons";

const STAT_ORDER: StatKey[] = ["hunger", "happy", "energy", "hygiene", "health"];

function PetCard() {
  const name = useGame((s) => s.name);
  const level = useGame((s) => s.level);
  const xp = useGame((s) => s.xp);
  const bornAt = useGame((s) => s.bornAt);
  const mood = useGame((s) => moodOf(s));
  const setNaming = useGame((s) => s.setNaming);
  const stage = STAGES[stageIndexFor(level)].name;
  const day = Math.floor((Date.now() - bornAt) / 86400000) + 1;
  const pct = Math.min(100, (xp / xpForLevel(level)) * 100);
  return (
    <div className="card pet-card">
      <div className="avatar">
        <IconCow size={46} />
      </div>
      <div className="pet-meta">
        <div className="pet-name-row">
          <span className="pet-name">{name}</span>
          <button type="button" className="icon-btn tiny" onClick={() => setNaming(true)} aria-label="Rename pet">
            <IconPencil size={13} />
          </button>
        </div>
        <div className="pet-sub">
          <span className="chip chip--level">Lv {level}</span>
          <span className="chip chip--stage">{stage}</span>
          <span className="muted">Day {day}</span>
        </div>
        <div className="xp" title={`${Math.floor(xp)} / ${xpForLevel(level)} XP`}>
          <div className="xp-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="mood">{mood}</div>
      </div>
    </div>
  );
}

function StatsCard() {
  const stats = useGame((s) => s.stats);
  const sick = useGame((s) => s.sick);
  return (
    <div className="card stats-card" aria-label="Pet stats">
      {STAT_ORDER.map((k) => {
        const v = stats[k];
        const Icon = STAT_ICON[k];
        const low = v < 25 || (k === "health" && sick);
        return (
          <div key={k} className={`stat${low ? " is-low" : ""}`} style={{ "--c": STAT_META[k].color } as React.CSSProperties}>
            <span className="stat-icon">
              <Icon size={15} />
            </span>
            <div className="stat-body">
              <div className="stat-label">
                <span>{STAT_META[k].label}</span>
                <span className="stat-val">{Math.round(v)}</span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${v}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Utility() {
  const sound = useGame((s) => s.sound);
  const music = useGame((s) => s.music);
  const panel = useGame((s) => s.panel);
  const toggleSound = useGame((s) => s.toggleSound);
  const toggleMusic = useGame((s) => s.toggleMusic);
  const setPanel = useGame((s) => s.setPanel);
  return (
    <div className="utility">
      <button type="button" className={`icon-btn${sound ? "" : " is-off"}`} onClick={toggleSound} aria-label={sound ? "Mute sounds" : "Unmute sounds"} title="Sound (M)">
        <IconSound size={18} off={!sound} />
      </button>
      <button type="button" className={`icon-btn${music ? "" : " is-off"}`} onClick={toggleMusic} aria-label={music ? "Turn music off" : "Turn music on"} title="Music">
        <IconMusic size={18} off={!music} />
      </button>
      <button type="button" className={`icon-btn${panel === "settings" ? " is-active" : ""}`} onClick={() => setPanel("settings")} aria-label="Settings">
        <IconGear size={18} />
      </button>
    </div>
  );
}

function DockButton({
  icon,
  label,
  color,
  onClick,
  active,
  disabled,
  badge,
  pulse,
  kbd,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  badge?: number;
  pulse?: boolean;
  kbd?: string;
}) {
  return (
    <button
      type="button"
      className={`dock-btn${active ? " is-active" : ""}${pulse ? " is-pulse" : ""}`}
      style={{ "--c": color } as React.CSSProperties}
      onClick={() => {
        initAudio();
        sfx.click();
        onClick();
      }}
      disabled={disabled}
      title={kbd ? `${label} (${kbd})` : label}
    >
      <span className="dock-icon">{icon}</span>
      <span className="dock-label">{label}</span>
      {badge ? <span className="dock-badge">{badge}</span> : null}
    </button>
  );
}

function Dock() {
  const panel = useGame((s) => s.panel);
  const mode = useGame((s) => s.mode);
  const asleep = useGame((s) => s.asleep);
  const sick = useGame((s) => s.sick);
  const health = useGame((s) => s.stats.health);
  const poops = useGame((s) => s.poops.length);
  const g = useGame.getState;
  return (
    <nav className="dock" aria-label="Care actions">
      <DockButton icon={<IconFeed size={26} />} label="Feed" color="#ff9a52" active={panel === "feed"} disabled={asleep} onClick={() => g().setPanel("feed")} kbd="F" />
      <DockButton
        icon={<IconBall size={26} />}
        label="Play"
        color="#ff6fa3"
        active={mode === "play"}
        disabled={asleep}
        onClick={() => (g().mode === "play" ? g().endPlay("done") : g().startPlay())}
        kbd="P"
      />
      <DockButton
        icon={<IconBubbles size={26} />}
        label="Clean"
        color="#2fbfb4"
        active={mode === "clean"}
        disabled={asleep}
        badge={poops}
        onClick={() => (g().mode === "clean" ? g().endClean() : g().startClean())}
        kbd="C"
      />
      <DockButton icon={asleep ? <IconSun size={26} /> : <IconMoon size={26} />} label={asleep ? "Wake" : "Sleep"} color="#7a8cff" active={asleep} onClick={() => g().toggleSleep()} kbd="S" />
      {(sick || health < 60) && (
        <DockButton icon={<IconPill size={26} />} label="Heal" color="#ff5b7a" pulse={sick} disabled={asleep} onClick={() => g().heal()} kbd="H" />
      )}
      <DockButton icon={<IconBow size={26} />} label="Style" color="#a98bff" active={panel === "style"} onClick={() => g().setPanel("style")} kbd="W" />
    </nav>
  );
}

function Wardrobe() {
  const level = useGame((s) => s.level);
  const equipped = useGame((s) => s.equipped);
  const equip = useGame((s) => s.equip);
  const setPanel = useGame((s) => s.setPanel);
  const name = useGame((s) => s.name);
  return (
    <section className="panel wardrobe" data-tray aria-label="Wardrobe">
      <div className="panel-head">
        <span className="panel-title">Wardrobe</span>
        <span className="panel-hint">Dress up {name}. Level up to unlock more</span>
        <button type="button" className="icon-btn" onClick={() => setPanel(null)} aria-label="Close wardrobe">
          <IconClose size={16} />
        </button>
      </div>
      <div className="food-row">
        {ACCESSORIES.map((a) => {
          const locked = a.level > level;
          const on = equipped[a.slot] === a.id;
          return (
            <button
              key={a.id}
              type="button"
              className={`food-card acc-card${locked ? " is-locked" : ""}${on ? " is-on" : ""}`}
              onClick={() => (locked ? useGame.getState().toast(`${a.name} unlocks at level ${a.level}`) : equip(a.slot, a.id))}
              aria-pressed={on}
            >
              <span className="food-icon">
                <AccessoryIcon id={a.id} size={42} />
              </span>
              <span className="food-name">{a.name}</span>
              <span className="acc-slot">{on ? "Wearing" : a.slot}</span>
              {locked && (
                <span className="food-lock">
                  <IconLock size={16} />
                  <span>Lv {a.level}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ModeBar() {
  const mode = useGame((s) => s.mode);
  const asleep = useGame((s) => s.asleep);
  const name = useGame((s) => s.name);
  const rally = useGame((s) => s.rally);
  const best = useGame((s) => s.bestRally);
  const hygiene = useGame((s) => s.stats.hygiene);
  const energy = useGame((s) => s.stats.energy);
  const poops = useGame((s) => s.poops.length);

  if (asleep) {
    return (
      <section className="panel mode-bar mode-bar--sleep" data-tray>
        <div className="mode-copy">
          <span className="panel-title">Zzz...</span>
          <span className="panel-hint">{name} is recharging. They'll wake up on their own when rested.</span>
        </div>
        <div className="mode-meter" style={{ "--c": STAT_META.energy.color } as React.CSSProperties}>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${energy}%` }} />
          </div>
          <span>{Math.round(energy)}%</span>
        </div>
      </section>
    );
  }
  if (mode === "play") {
    return (
      <section className="panel mode-bar" data-tray>
        <div className="mode-copy">
          <span className="panel-title">Playtime</span>
          <span className="panel-hint">Tap the ball to kick it. {name} will chase and boop it back.</span>
        </div>
        <div className="rally">
          <span className="rally-num" key={rally}>
            {rally}
          </span>
          <span className="rally-label">boops{best > 0 ? ` · best ${best}` : ""}</span>
        </div>
        <button type="button" className="btn" onClick={() => useGame.getState().endPlay("done")}>
          Done
        </button>
      </section>
    );
  }
  if (mode === "clean") {
    return (
      <section className="panel mode-bar" data-tray>
        <div className="mode-copy">
          <span className="panel-title">Bath time</span>
          <span className="panel-hint">
            Scrub {name} by dragging over them.{poops > 0 ? ` Tap the ${poops === 1 ? "poop" : `${poops} poops`} to sweep up.` : ""}
          </span>
        </div>
        <div className="mode-meter" style={{ "--c": STAT_META.hygiene.color } as React.CSSProperties}>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${hygiene}%` }} />
          </div>
          <span>{Math.round(hygiene)}%</span>
        </div>
        <button type="button" className="btn" onClick={() => useGame.getState().endClean()}>
          Done
        </button>
      </section>
    );
  }
  return null;
}

function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

const NAME_IDEAS = ["Cowdie", "Mooana", "Moozart", "Daisy", "Milkshake", "Clover", "Butterbean", "Mochi"];

function NameDialog() {
  const current = useGame((s) => s.name);
  const rename = useGame((s) => s.rename);
  const setNaming = useGame((s) => s.setNaming);
  const [value, setValue] = useState(current);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && setNaming(false)}>
      <form
        className="card modal"
        onSubmit={(e) => {
          e.preventDefault();
          rename(value);
          sfx.sparkle();
        }}
      >
        <div className="modal-cow">
          <IconCow size={72} />
        </div>
        <h2 className="modal-title">What's your calf's name?</h2>
        <p className="modal-copy">Every good cow deserves a great name.</p>
        <input ref={input} className="name-input" value={value} maxLength={16} onChange={(e) => setValue(e.target.value)} aria-label="Pet name" />
        <div className="name-ideas">
          {NAME_IDEAS.map((n) => (
            <button key={n} type="button" className={`chip chip--btn${value === n ? " is-on" : ""}`} onClick={() => setValue(n)}>
              {n}
            </button>
          ))}
        </div>
        <button type="submit" className="btn primary wide">
          That's the one
        </button>
      </form>
    </div>
  );
}

function LevelUpCard() {
  const info = useGame((s) => s.levelUp);
  const name = useGame((s) => s.name);
  const dismiss = useGame((s) => s.dismissLevelUp);
  useEffect(() => {
    if (!info) return;
    const id = window.setTimeout(dismiss, 7000);
    return () => window.clearTimeout(id);
  }, [info, dismiss]);
  if (!info) return null;
  return (
    <div className="levelup card" role="dialog" aria-label="Level up">
      <div className="levelup-star">
        <IconStar size={30} />
      </div>
      <div className="levelup-title">Level {info.level}!</div>
      {info.stage && (
        <div className="levelup-stage">
          {name} grew into a {info.stage.toLowerCase()} cow{info.stage === "Young" ? " and sprouted horns" : ""}!
        </div>
      )}
      {info.unlocks.length > 0 && (
        <div className="levelup-unlocks">
          <span className="muted">Unlocked</span>
          {info.unlocks.map((u) => (
            <span key={u} className="chip">
              {u}
            </span>
          ))}
        </div>
      )}
      <button type="button" className="btn primary" onClick={dismiss}>
        Yay!
      </button>
    </div>
  );
}

function SettingsSheet() {
  const totals = useGame((s) => s.totals);
  const best = useGame((s) => s.bestRally);
  const name = useGame((s) => s.name);
  const setPanel = useGame((s) => s.setPanel);
  const reset = useGame((s) => s.reset);
  const [confirm, setConfirm] = useState(false);
  return (
    <section className="card settings" aria-label="Settings">
      <div className="panel-head">
        <span className="panel-title">{name}'s journal</span>
        <button type="button" className="icon-btn" onClick={() => setPanel(null)} aria-label="Close settings">
          <IconClose size={16} />
        </button>
      </div>
      <div className="journal">
        <div>
          <b>{totals.fed}</b>
          <span>snacks</span>
        </div>
        <div>
          <b>{totals.pets}</b>
          <span>pets</span>
        </div>
        <div>
          <b>{totals.cleans}</b>
          <span>baths</span>
        </div>
        <div>
          <b>{best}</b>
          <span>best rally</span>
        </div>
      </div>
      <div className="shortcuts">
        <span>
          <kbd>F</kbd> feed
        </span>
        <span>
          <kbd>P</kbd> play
        </span>
        <span>
          <kbd>C</kbd> clean
        </span>
        <span>
          <kbd>S</kbd> sleep
        </span>
        <span>
          <kbd>W</kbd> style
        </span>
        <span>
          <kbd>M</kbd> mute
        </span>
      </div>
      <button
        type="button"
        className={`btn danger wide${confirm ? " is-confirm" : ""}`}
        onClick={() => {
          if (!confirm) {
            setConfirm(true);
            window.setTimeout(() => setConfirm(false), 3000);
            return;
          }
          reset();
        }}
      >
        {confirm ? "Tap again to say goodbye" : "Start over with a new egg"}
      </button>
    </section>
  );
}

function EggHint() {
  const cracks = useGame((s) => s.eggCracks);
  return (
    <div className="egg-hint card">
      <div className="egg-hint-title">A spotted egg is wobbling...</div>
      <div className="egg-hint-copy">Tap it to help it hatch</div>
      <div className="egg-dots">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < cracks ? "is-on" : ""} />
        ))}
      </div>
    </div>
  );
}

function FloatLayer() {
  const floats = useGame((s) => s.floats);
  return (
    <>
      {floats.map((f) => (
        <div
          key={f.id}
          className="float-anchor"
          ref={(el) => {
            if (el) floatEls.set(f.id, el);
            else floatEls.delete(f.id);
          }}
        >
          <div className="float-text" style={{ color: f.color }}>
            {f.text}
          </div>
        </div>
      ))}
    </>
  );
}

function PoopNudge() {
  const poops = useGame((s) => s.poops.length);
  const mode = useGame((s) => s.mode);
  if (poops < 1 || mode === "clean") return null;
  return (
    <button type="button" className="poop-nudge" onClick={() => useGame.getState().startClean()} title="Clean up">
      <IconPoop size={16} />
      <span>{poops}</span>
    </button>
  );
}

export function Hud() {
  const hatched = useGame((s) => s.hatched);
  const asleep = useGame((s) => s.asleep);
  const mode = useGame((s) => s.mode);
  const panel = useGame((s) => s.panel);
  const naming = useGame((s) => s.naming);
  const topRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const stacked = window.innerWidth <= 760;
      ui.top = stacked && topRef.current ? topRef.current.getBoundingClientRect().bottom : 0;
      ui.bottom = bottomRef.current ? window.innerHeight - bottomRef.current.getBoundingClientRect().top : 0;
      document.documentElement.style.setProperty("--hud-top", `${ui.top}px`);
    };
    const ro = new ResizeObserver(measure);
    if (topRef.current) ro.observe(topRef.current);
    if (bottomRef.current) ro.observe(bottomRef.current);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      ui.top = 0;
      ui.bottom = 0;
    };
  }, [hatched]);

  return (
    <div className={`hud${asleep ? " is-asleep" : ""} mode-${mode}`}>
      <div className="world-layer" aria-hidden>
        <BubbleLayer />
        <FloatLayer />
      </div>
      <header className="hud-top" ref={topRef}>
        <div className="hud-left">
          <h1 className="brand">Claude Opus 5.5</h1>
          {hatched && <PetCard />}
        </div>
        <div className="hud-right">
          <Utility />
          {hatched && <StatsCard />}
          {hatched && <PoopNudge />}
        </div>
      </header>

      <Toasts />

      {!hatched && <EggHint />}

      {hatched && (
        <footer className="hud-bottom" ref={bottomRef}>
          <div className="panel-slot">
            {asleep || mode !== "normal" ? <ModeBar /> : panel === "feed" ? <FoodTray /> : panel === "style" ? <Wardrobe /> : null}
          </div>
          <Dock />
        </footer>
      )}

      {panel === "settings" && <SettingsSheet />}
      <LevelUpCard />
      {naming && <NameDialog />}
    </div>
  );
}
