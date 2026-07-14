import { useRef, useState } from 'react';
import { ColorPicker } from './ColorPicker';

interface Props {
  color: string;
  opacity: number;
  onChange: (color: string, opacity: number) => void;
}

export const ColorSwatch = ({ color, opacity, onChange }: Props): JSX.Element => {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={btnRef}
        className="w-5 h-5 rounded border border-panel-divider shrink-0 relative overflow-hidden color-swatch-bg"
        onClick={() => {
          setRect(btnRef.current?.getBoundingClientRect() ?? null);
          setOpen((v) => !v);
        }}
      >
        <div className="absolute inset-0" style={{ background: color, opacity }} />
      </button>
      {open && (
        <ColorPicker
          color={color}
          opacity={opacity}
          onChange={onChange}
          onClose={() => setOpen(false)}
          anchorRect={rect}
        />
      )}
    </>
  );
};
