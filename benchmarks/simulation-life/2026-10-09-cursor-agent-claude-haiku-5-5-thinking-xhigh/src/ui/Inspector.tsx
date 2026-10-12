import type { Pick } from '../render/worldRenderer';
import { MAX_ENERGY, TREE_REACH } from '../sim/world';
import type { Action, Blob, World } from '../sim/types';
import { fmtTime } from '../sim/analysis';

const ACTION_LABEL: Record<Action, string> = {
  wander: 'Wandering',
  idle: 'Resting',
  seek: 'Looking for fruit',
  gather: 'Gathering fruit',
  avoid: 'Stepping away from a crowd',
  flee: 'Fleeing red',
  eat: 'Eating fruit',
  hunt: 'Hunting blue',
  pause: 'Paused after a bite',
};

interface InspectorProps {
  world: World;
  selected: Pick | null;
  onClear: () => void;
}

export function Inspector({ world, selected, onClear }: InspectorProps) {
  if (!selected) {
    return (
      <section className="card inspector">
        <h2>Inspector</h2>
        <p className="muted">Click a blob or tree in the garden to inspect it. Drag to rotate, scroll to zoom.</p>
      </section>
    );
  }

  if (selected.kind === 'tree') {
    const t = world.trees.find((o) => o.id === selected.id);
    if (!t) return <Gone label="This tree is gone." onClear={onClear} />;
    const limit = world.params.fruitLimit;
    return (
      <section className="card inspector">
        <header className="insp-head">
          <h2>Fruit tree</h2>
          <button className="btn small" onClick={onClear}>
            Close
          </button>
        </header>
        <Row label="Ripe fruit" value={`${t.fruit} / ${limit}`} />
        <Bar label="Next fruit" ratio={t.growth} color="var(--green)" text={`${Math.round(t.growth * 100)}%`} />
        <Row label="Waiting to regrow" value={`${t.pending.length}`} />
        <Row label="Picks so far" value={`${t.eaten}`} />
        <Row label="Reach to chew" value={`${TREE_REACH} units`} />
      </section>
    );
  }

  const list = selected.kind === 'blue' ? world.blue : world.red;
  const b = list.find((o) => o.id === selected.id);
  if (!b) return <Gone label="This blob has died." onClear={onClear} />;
  return <BlobCard world={world} b={b} onClear={onClear} />;
}

function BlobCard({ world, b, onClear }: { world: World; b: Blob; onClear: () => void }) {
  const isBlue = b.group === 'blue';
  const vision = (isBlue ? world.params.blueVision : world.params.redVision) * b.visionTrait;
  const timed = b.action === 'eat' || b.action === 'pause';
  const energyRatio = Math.max(0, Math.min(1, b.energy / MAX_ENERGY));

  return (
    <section className="card inspector">
      <header className="insp-head">
        <h2>
          <span className={`dot ${isBlue ? 'blue' : 'red'}`} />
          {isBlue ? 'Blue' : 'Red'} blob
        </h2>
        <button className="btn small" onClick={onClear}>
          Close
        </button>
      </header>
      <Bar label="Energy" ratio={energyRatio} color={isBlue ? 'var(--blue)' : 'var(--red)'} text={`${Math.round(b.energy)}`} />
      <Row label="Age" value={fmtTime(b.age)} />
      <Row label="Action" value={ACTION_LABEL[b.action]} />
      {timed && (
        <Row
          label={b.action === 'eat' ? 'Chewing, time left' : 'Pause, time left'}
          value={`${Math.max(0, b.actionTimer).toFixed(1)} s`}
        />
      )}
      {b.action === 'eat' && isBlue && <Row label="Energy still to absorb" value={`${Math.max(0, b.eatRemain).toFixed(1)}`} />}
      <Row label="Speed" value={`${b.moved.toFixed(2)} u/s`} />
      <Row label="Sensing range" value={`${vision.toFixed(1)} units`} />
      <Row label="Speed trait" value={`×${b.speedTrait.toFixed(2)}`} />
      <Row label="Vision trait" value={`×${b.visionTrait.toFixed(2)}`} />
      <Row label="Generation" value={`${b.generation}`} />
      <Row label="Copies made" value={`${b.births}`} />
      {isBlue ? (
        <>
          <Row label="Fruit eaten" value={`${b.eats}`} />
          <Row label="Bites taken" value={`${b.bitten}`} />
        </>
      ) : (
        <Row label="Bites made" value={`${b.bites}`} />
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="insp-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Bar({ label, ratio, color, text }: { label: string; ratio: number; color: string; text: string }) {
  return (
    <div className="insp-bar">
      <div className="insp-row">
        <span>{label}</span>
        <strong>{text}</strong>
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${Math.round(ratio * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function Gone({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <section className="card inspector">
      <header className="insp-head">
        <h2>Inspector</h2>
        <button className="btn small" onClick={onClear}>
          Close
        </button>
      </header>
      <p className="muted">{label}</p>
    </section>
  );
}
