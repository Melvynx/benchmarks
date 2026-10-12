import { useEffect, useRef, useState } from "react";
import { GardenRenderer } from "../render/GardenRenderer";
import { FollowIcon, OrbitIcon, PlayIcon, ViewIcon } from "./icons";
import { Inspector } from "./Inspector";
import { ctrl, shallowEqual, useSim } from "./sim";

export function GardenView() {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<GardenRenderer | null>(null);
  const [touched, setTouched] = useState(false);
  const s = useSim(
    (x) => ({
      blue: x.counts.blue,
      red: x.counts.red,
      fruit: x.counts.fruit,
      hiding: x.counts.hiding,
      running: x.running,
      fresh: x.time === 0,
      selected: x.selected,
      selectedTree: x.selectedTree,
      follow: x.follow,
      turntable: x.turntable,
      lagging: x.lagging,
      achieved: x.achievedSpeed,
      speed: x.params.simSpeed,
    }),
    shallowEqual,
  );

  useEffect(() => {
    const r = new GardenRenderer(host.current!, ctrl);
    r.onFirstInteraction = () => setTouched(true);
    renderer.current = r;
    if (import.meta.env.DEV) (window as unknown as { __gardenRenderer: GardenRenderer }).__gardenRenderer = r;
    return () => {
      r.dispose();
      renderer.current = null;
    };
  }, []);

  return (
    <section className="card garden-card" aria-label="Garden">
      <div ref={host} className="garden-host" />

      <div className="garden-counters" aria-live="polite">
        <span className="count-pill count-blue">
          <i className="dot" />
          <b>{s.blue}</b> blue
          {s.hiding > 0 && <em className="count-sub">{s.hiding} hiding</em>}
        </span>
        <span className="count-pill count-red">
          <i className="dot" />
          <b>{s.red}</b> red
        </span>
        <span className="count-pill count-fruit">
          <i className="dot" />
          <b>{s.fruit}</b> ripe fruit
        </span>
      </div>

      <div className="garden-tools">
        <button className="tool" onClick={() => renderer.current?.resetView()} title="Reset view" aria-label="Reset view">
          <ViewIcon />
        </button>
        <button
          className={`tool ${s.turntable ? "is-on" : ""}`}
          onClick={() => ctrl.setTurntable(!s.turntable)}
          title="Slowly spin the dish"
          aria-label="Spin the dish"
          aria-pressed={s.turntable}
        >
          <OrbitIcon />
        </button>
        <button
          className={`tool ${s.follow ? "is-on" : ""}`}
          onClick={() => ctrl.setFollow(!s.follow)}
          disabled={s.selected === null}
          title="Follow the selected blob (F)"
          aria-label="Follow the selected blob"
          aria-pressed={s.follow}
        >
          <FollowIcon />
        </button>
      </div>

      {s.lagging && (
        <div className="lag-badge" role="status">
          This device keeps up at about {s.achieved}× (asked for {s.speed}×)
        </div>
      )}

      {!touched && s.selected === null && s.selectedTree === null && (
        <div className="garden-hint">Drag to turn the dish · scroll to zoom · click a blob or tree</div>
      )}

      {s.fresh && !s.running && (
        <button className="start-cta" onClick={() => ctrl.play()}>
          <PlayIcon width={22} height={22} />
          Start the garden
        </button>
      )}

      {(s.selected !== null || s.selectedTree !== null) && <Inspector />}
    </section>
  );
}
