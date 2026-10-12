import { useEffect, useRef, useState } from 'react';
import { World } from '../three/World';
import { worldRef } from '../worldRef';
import { useGame } from '../game/store';

declare global {
  interface Window {
    __cowdie?: { world: World; store: typeof useGame };
  }
}

export function SceneView() {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let world: World | null = null;
    try {
      world = new World(el);
      worldRef.current = world;
      window.__cowdie = { world, store: useGame };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'WebGL is not available');
      return;
    }

    const topEl = document.querySelector<HTMLElement>('[data-hud="top"]');
    const dockEl = document.querySelector<HTMLElement>('[data-hud="bottom"]');
    const measure = () => {
      const top = topEl ? topEl.getBoundingClientRect().bottom : 0;
      const bottom = dockEl ? window.innerHeight - dockEl.getBoundingClientRect().top : 0;
      document.documentElement.style.setProperty('--top-h', `${Math.round(top)}px`);
      world?.setInsets(top, bottom);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (topEl) ro.observe(topEl);
    if (dockEl) ro.observe(dockEl);
    window.addEventListener('resize', measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      world?.dispose();
      worldRef.current = null;
      delete window.__cowdie;
    };
  }, []);

  return (
    <div className="stage" ref={ref}>
      {error && (
        <div className="scene-error" role="alert">
          <strong>Cowdie needs WebGL to play.</strong>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
