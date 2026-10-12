import { useEffect, useState } from "react";
import { FAVORITE_FOOD, FOODS, STAT_META, TRAY_FOODS, type FoodId } from "../game/content";
import { drag, ISLAND_RADIUS } from "../game/runtime";
import { useGame } from "../game/store";
import { initAudio, sfx } from "../game/audio";
import { FoodIcon, IconBolt, IconClose, IconHeart, IconLeaf, IconLock } from "./icons";

function beginFoodGesture(id: FoodId, e: React.PointerEvent) {
  initAudio();
  const g = useGame.getState();
  const check = g.canEat(id);
  if (check === "locked" || check === "cooldown" || check === "asleep") {
    g.toss(id);
    return;
  }
  e.preventDefault();
  const sx = e.clientX;
  const sy = e.clientY;
  let dragging = false;

  const move = (ev: PointerEvent) => {
    if (!dragging && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
      dragging = true;
      useGame.getState().startDrag(id);
      document.body.classList.add("is-dragging");
    }
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    document.body.classList.remove("is-dragging");
    const s = useGame.getState();
    if (!dragging) {
      if (ev.type !== "pointercancel") s.toss(id);
      return;
    }
    if (!s.drag) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const overUi = el?.closest("[data-tray], .dock");
    if (overUi || !drag.valid) {
      s.endDrag(null);
      sfx.click();
      return;
    }
    const p = drag.pos.clone();
    if (Math.hypot(p.x, p.z) < ISLAND_RADIUS && p.y < 0.45) p.y = 0.45;
    s.endDrag(p);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}

function FoodCard({ id, now }: { id: FoodId; now: number }) {
  const def = FOODS[id];
  const level = useGame((s) => s.level);
  const last = useGame((s) => s.lastFed[id]);
  const favFound = useGame((s) => s.favoriteFound);
  const dragging = useGame((s) => s.drag === id);
  const locked = def.level > level;
  const cdLeft = def.cooldown && last ? Math.max(0, def.cooldown * 1000 - (now - last)) : 0;
  const cdPct = def.cooldown ? cdLeft / (def.cooldown * 1000) : 0;
  const fav = favFound && id === FAVORITE_FOOD;

  const chips: { icon: React.ReactElement; v: number; c: string }[] = [];
  if (def.hunger) chips.push({ icon: <IconLeaf size={11} />, v: def.hunger, c: STAT_META.hunger.color });
  if (def.happy) chips.push({ icon: <IconHeart size={11} />, v: def.happy + (id === FAVORITE_FOOD && favFound ? 8 : 0), c: STAT_META.happy.color });
  if (def.energy >= 10) chips.push({ icon: <IconBolt size={11} />, v: def.energy, c: STAT_META.energy.color });

  return (
    <button
      type="button"
      className={`food-card${locked ? " is-locked" : ""}${cdLeft > 0 ? " is-cooling" : ""}${dragging ? " is-lifted" : ""}`}
      onPointerDown={(e) => beginFoodGesture(id, e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          useGame.getState().toss(id);
        }
      }}
      aria-label={`${def.name}${locked ? `, unlocks at level ${def.level}` : ""}`}
      title={locked ? `Unlocks at level ${def.level}` : `${def.name}: ${def.blurb}`}
    >
      {fav && (
        <span className="food-fav" title="Favorite food">
          <IconHeart size={12} />
        </span>
      )}
      <span className="food-icon">
        <FoodIcon id={id} size={42} />
      </span>
      <span className="food-name">{def.name}</span>
      <span className="food-chips">
        {chips.slice(0, 2).map((c, i) => (
          <span key={i} className="food-chip" style={{ color: c.c }}>
            {c.icon}+{c.v}
          </span>
        ))}
      </span>
      {locked && (
        <span className="food-lock">
          <IconLock size={16} />
          <span>Lv {def.level}</span>
        </span>
      )}
      {cdLeft > 0 && (
        <span className="food-cooldown" style={{ "--p": `${cdPct * 360}deg` } as React.CSSProperties}>
          <span>{Math.ceil(cdLeft / 1000)}s</span>
        </span>
      )}
    </button>
  );
}

export function FoodTray() {
  const name = useGame((s) => s.name);
  const hunger = useGame((s) => s.stats.hunger);
  const setPanel = useGame((s) => s.setPanel);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  const full = hunger >= 96;
  return (
    <section className="panel food-tray" data-tray aria-label="Food tray">
      <div className="panel-head">
        <span className="panel-title">Snacks</span>
        <span className="panel-hint">
          {full ? `${name} is stuffed. There's always room for a cupcake though` : `Drag a snack into ${name}'s mouth, or tap to toss it`}
        </span>
        <button type="button" className="icon-btn" onClick={() => setPanel(null)} aria-label="Close food tray">
          <IconClose size={16} />
        </button>
      </div>
      <div className="food-row">
        {TRAY_FOODS.map((id) => (
          <FoodCard key={id} id={id} now={now} />
        ))}
      </div>
    </section>
  );
}
