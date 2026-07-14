import { useEffect, useRef } from 'react';
import { useStore } from '../state/store';
import { Renderer } from '../core/render';
import { InputController } from '../core/input';
import { buildToolbox } from '../core/tools';
import { TextEditor } from './TextEditor';

/** Top-level canvas element + renderer lifecycle. */
export const Canvas = (): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const inputRef = useRef<InputController | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const renderer = new Renderer({ canvas });
    rendererRef.current = renderer;

    const toolbox = buildToolbox();
    const input = new InputController({ canvas, toolbox });
    inputRef.current = input;
    input.attach();

    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect();
      renderer.resize(width, height);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // Wire store → renderer
    const unsub = useStore.subscribe((s) => {
      renderer.setState(s);
      input.updateCursor();
    });
    // Initial
    renderer.setState(useStore.getState());

    return () => {
      ro.disconnect();
      input.detach();
      renderer.dispose();
      unsub();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative flex-1 overflow-hidden bg-panel-bg"
      style={{ contain: 'strict' }}
    >
      <canvas ref={canvasRef} className="block absolute inset-0" />
      <TextEditor />
    </div>
  );
};
