import { RULES } from "../sim/params";
import type { Blob, Tree } from "../sim/types";
import {
  availableFruit,
  copyThresholdOf,
  maxEnergyOf,
  nextFruitEta,
  topSpeedOf,
  visionOf,
  type World,
} from "../sim/world";
import { CloseIcon, FollowIcon } from "./icons";
import { ctrl, fmtTime, useSim } from "./sim";

function describe(w: World, b: Blob): string {
  const target = b.species === "red" && b.targetId >= 0 ? w.byId.get(b.targetId) : undefined;
  switch (b.action) {
    case "wander":
      return b.species === "blue" ? "Wandering, looking for fruit" : "Wandering";
    case "seek":
      return "Heading to a fruit tree";
    case "eat":
      return "Munching a fruit";
    case "wait":
      return "Waiting under a tree for fruit to ripen";
    case "rest":
      return "Full, resting near its favourite tree";
    case "flee":
      return "Running away from a red blob!";
    case "hide":
      return b.sheltered ? "Hiding under a tree, out of red's sight" : "Dashing for cover under a tree";
    case "startled":
      return "Bumped by a red blob, bouncing away";
    case "hunt":
      return "Searching for blue blobs";
    case "lurk":
      return "Lurking still to save energy";
    case "chase":
      return target ? `Chasing ${target.name}` : "Chasing a blue blob";
    case "pause":
      return "Resting after a contact";
    case "tired":
      return "Out of breath after a long chase";
    case "lounge":
      return "Full, lounging about";
    case "fade":
      return b.fadeCause === "contact" ? "Fading after losing its energy to red" : "Fading from hunger";
  }
}

function timerInfo(w: World, b: Blob): { label: string; left: number; frac: number | null } | null {
  const frac = (b.timerTotal > 0 ? 1 - b.timer / b.timerTotal : null) as number | null;
  switch (b.action) {
    case "hide": {
      if (!b.sheltered) return null;
      const calm = w.time - b.lastThreatAt;
      return { label: "calms down in", left: RULES.hideMemory - calm, frac: Math.min(1, calm / RULES.hideMemory) };
    }
    case "eat":
      return { label: "chewing", left: b.timer, frac };
    case "pause":
      return { label: "pause", left: b.timer, frac };
    case "tired":
      return { label: "catching breath", left: b.timer, frac };
    case "startled":
      return { label: "startled", left: b.timer, frac };
    case "fade":
      return { label: "fading", left: b.timer, frac };
    case "chase":
      return { label: "stamina", left: RULES.chaseStamina - b.chaseFor, frac: b.chaseFor / RULES.chaseStamina };
    case "hunt":
      return { label: "hunts for", left: b.timer, frac: null };
    case "lurk":
      return { label: "lurks for", left: b.timer, frac: null };
    default:
      return null;
  }
}

const gene = (g: number) => `×${g.toFixed(2)}`;

function GeneBar({ label, value }: { label: string; value: number }) {
  const pct = ((value - 0.5) / 1.5) * 100;
  const mid = (0.5 / 1.5) * 100;
  return (
    <div className="gene">
      <span className="gene-label">{label}</span>
      <span className="gene-track">
        <i className="gene-mid" style={{ left: `${mid}%` }} />
        <i className={`gene-dot ${value >= 1 ? "up" : "down"}`} style={{ left: `${Math.max(0, Math.min(100, pct))}%` }} />
      </span>
      <span className="gene-val">{gene(value)}</span>
    </div>
  );
}

function copyHold(w: World, b: Blob, thr: number): string | null {
  if (b.energy < thr || b.action === "fade") return null;
  if (b.species === "blue" && b.sheltered && w.time - b.lastThreatAt < RULES.hideMemory)
    return "Enough energy to copy, but too scared while a red is close.";
  if (b.species === "red" && (b.action === "pause" || b.action === "tired"))
    return "Enough energy to copy once it gets moving again.";
  return null;
}

function BlobCard({ w, b, follow }: { w: World; b: Blob; follow: boolean }) {
  const p = w.params;
  const thr = copyThresholdOf(b.species, p);
  const max = maxEnergyOf(b.species, p);
  const t = timerInfo(w, b);
  const hold = copyHold(w, b, thr);
  const parent = b.parentId >= 0 ? w.byId.get(b.parentId) : undefined;
  const founder = w.byId.get(b.founderId);
  return (
    <>
      <div className="insp-head">
        <span className={`insp-swatch ${b.species}`} />
        <div>
          <div className="insp-name">{b.name}</div>
          <div className="insp-sub">
            {b.species === "blue" ? "Blue" : "Red"} group · generation {b.generation}
          </div>
        </div>
      </div>

      <div className={`insp-action act-${b.action}`}>{describe(w, b)}</div>

      {t && (
        <div className="insp-timer">
          <span>{t.label}</span>
          {t.frac !== null && (
            <span className="bar thin">
              <i style={{ width: `${Math.max(0, Math.min(1, t.frac)) * 100}%` }} />
            </span>
          )}
          <b>{Math.max(0, t.left).toFixed(1)}s</b>
        </div>
      )}

      <div className="insp-energy">
        <div className="insp-row">
          <span>Energy</span>
          <b>
            {Math.max(0, b.energy).toFixed(0)} <small>/ {thr} to copy</small>
          </b>
        </div>
        <span className={`bar energy ${b.species}`}>
          <i style={{ width: `${Math.max(0, Math.min(1, b.energy / max)) * 100}%` }} />
          <em style={{ left: `${(thr / max) * 100}%` }} title="Copy threshold" />
        </span>
        {hold && <p className="insp-hold">{hold}</p>}
      </div>

      <dl className="insp-grid">
        <dt>Age</dt>
        <dd>{fmtTime(b.age)}</dd>
        <dt>Speed</dt>
        <dd>
          {b.speed.toFixed(1)}{" "}
          <small>
            {b.speed > topSpeedOf(b, p) + 0.05 ? "m/s · fear burst" : `/ ${topSpeedOf(b, p).toFixed(1)} m/s`}
          </small>
        </dd>
        <dt>Sensing</dt>
        <dd>{visionOf(b, p).toFixed(1)} m</dd>
        <dt>{b.species === "blue" ? "Fruit eaten" : "Contacts"}</dt>
        <dd>{b.species === "blue" ? b.meals : b.contacts}</dd>
        <dt>Copies made</dt>
        <dd>{b.children}</dd>
        <dt>Family</dt>
        <dd>
          {b.parentId < 0 ? "Founder" : parent ? `child of ${parent.name}` : "parent faded"}
          {b.parentId >= 0 && <small> · line of {founder ? founder.name : `#${b.founderId}`}</small>}
        </dd>
      </dl>

      <div className="insp-genes">
        <GeneBar label="Speed gene" value={b.genes.speed} />
        <GeneBar label="Vision gene" value={b.genes.vision} />
      </div>

      <div className="insp-actions">
        <button className={`btn small ${follow ? "is-on" : ""}`} onClick={() => ctrl.setFollow(!follow)} disabled={b.action === "fade"}>
          <FollowIcon width={15} height={15} />
          {follow ? "Following" : "Follow"}
        </button>
      </div>
    </>
  );
}

function TreeCard({ w, t }: { w: World; t: Tree }) {
  const limit = Math.min(RULES.maxFruitSlots, Math.round(w.params.fruitLimit));
  const ripe = availableFruit(w, t);
  let eating = 0;
  let growing = 0;
  let resting = 0;
  for (let s = 0; s < limit; s++) {
    const slot = t.slots[s];
    if (slot.claimedBy >= 0) eating++;
    else if (slot.growth < 1 && slot.cooldown > 0) resting++;
    else if (slot.growth < 1) growing++;
  }
  const eta = nextFruitEta(w, t);
  return (
    <>
      <div className="insp-head">
        <span className="insp-swatch tree" />
        <div>
          <div className="insp-name">Fruit tree #{t.id + 1}</div>
          <div className="insp-sub">Holds up to {limit} fruit</div>
        </div>
      </div>
      <div className="fruit-slots" aria-label="Fruit on this tree">
        {Array.from({ length: limit }, (_, s) => {
          const slot = t.slots[s];
          const cls = slot.claimedBy >= 0 ? "eaten" : slot.growth >= 1 ? "ripe" : slot.cooldown > 0 ? "empty" : "growing";
          return <i key={s} className={`slot ${cls}`} style={{ ["--g" as string]: slot.growth }} />;
        })}
      </div>
      <dl className="insp-grid">
        <dt>Ripe now</dt>
        <dd>{ripe}</dd>
        <dt>Being eaten</dt>
        <dd>{eating}</dd>
        <dt>Growing</dt>
        <dd>{growing}</dd>
        <dt>Resting branches</dt>
        <dd>{resting}</dd>
        <dt>Next ripe fruit</dt>
        <dd>{ripe > 0 ? "ready" : Number.isFinite(eta) ? `in ${eta.toFixed(1)}s` : "—"}</dd>
        <dt>Blue hiding here</dt>
        <dd>
          {w.treeSheltered[t.id] ?? 0} <small>/ {RULES.shelterSlots}</small>
        </dd>
        <dt>Fruit served</dt>
        <dd>{t.meals}</dd>
      </dl>
    </>
  );
}

export function Inspector() {
  useSim((x) => x.version);
  const w = ctrl.world;
  const b = ctrl.selected !== null ? w.byId.get(ctrl.selected) : undefined;
  const t = ctrl.selectedTree !== null ? w.trees[ctrl.selectedTree] : undefined;
  const close = () => {
    ctrl.select(null);
    ctrl.selectTree(null);
  };

  return (
    <aside className="inspector" aria-label="Inspector">
      <button className="insp-close" onClick={close} title="Close (Esc)">
        <CloseIcon width={16} height={16} />
      </button>
      {b ? (
        <BlobCard w={w} b={b} follow={ctrl.follow} />
      ) : t ? (
        <TreeCard w={w} t={t} />
      ) : (
        <div className="insp-gone">
          <div className="insp-name">Gone</div>
          <p>This blob has faded from the garden. Click another one to inspect it.</p>
        </div>
      )}
    </aside>
  );
}
