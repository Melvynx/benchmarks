import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import type { Label } from '../lib/types';
import { avatarColor, initialOf } from '../lib/mail';

export function Icon({ name, fill, size, className = '', style }: { name: string; fill?: boolean; size?: 'sm' | 'xs'; className?: string; style?: CSSProperties }) {
  return (
    <span className={`icon${fill ? ' fill' : ''}${size ? ` ${size}` : ''}${className ? ` ${className}` : ''}`} style={style} aria-hidden="true">
      {name}
    </span>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: string;
  label: string;
  fill?: boolean;
  small?: boolean;
  active?: boolean;
  tip?: boolean;
  badge?: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, fill, small, active, tip = true, badge, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      data-tip={tip ? label : undefined}
      className={`icon-btn${small ? ' sm' : ''}${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      <Icon name={icon} fill={fill} />
      {badge}
    </button>
  );
});

export function Avatar({ name, email, color, size = 40 }: { name: string; email?: string; color?: string; size?: number }) {
  const label = name || email || '?';
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44), background: avatarColor(label, color) }}
    >
      {initialOf(label)}
    </span>
  );
}

export function Checkbox({
  state,
  label,
  onChange,
  className = '',
}: {
  state: 'checked' | 'unchecked' | 'indeterminate';
  label: string;
  onChange: (e: MouseEvent) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'indeterminate' ? 'mixed' : state === 'checked'}
      aria-label={label}
      className={`cb-hit ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(e);
      }}
    >
      <span className={`cb ${state === 'checked' ? 'checked' : state === 'indeterminate' ? 'indeterminate' : ''}`} />
    </button>
  );
}

export function LabelChip({ label, onRemove }: { label: Label; onRemove?: () => void }) {
  return (
    <span className="chip" style={{ ['--chip' as string]: label.color }}>
      {label.name}
      {onRemove && (
        <button type="button" aria-label={`Remove label ${label.name}`} onClick={onRemove}>
          <Icon name="close" size="xs" />
        </button>
      )}
    </span>
  );
}

/** Wrap occurrences of any `terms` in <mark>. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const t of terms) {
    if (!t) continue;
    let i = lower.indexOf(t);
    while (i >= 0) {
      ranges.push([i, i + t.length]);
      i = lower.indexOf(t, i + t.length);
    }
  }
  if (!ranges.length) return <>{text}</>;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  const out: ReactNode[] = [];
  let pos = 0;
  merged.forEach(([s, e], i) => {
    if (s > pos) out.push(text.slice(pos, s));
    out.push(<mark key={i}>{text.slice(s, e)}</mark>);
    pos = e;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return <>{out}</>;
}
