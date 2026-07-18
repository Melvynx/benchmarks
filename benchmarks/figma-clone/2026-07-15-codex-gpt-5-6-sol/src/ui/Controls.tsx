import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from "react";

import { Icon, type IconName } from "./Icon";

export function IconButton({ icon, label, active = false, disabled = false, onClick, className = "" }: {
  readonly icon: IconName;
  readonly label: string;
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly className?: string;
}) {
  return <button aria-label={label} className={`icon-button ${active ? "is-active" : ""} ${className}`} data-tooltip={label} disabled={disabled} onClick={onClick}><Icon name={icon} /></button>;
}

export function Section({ title, action, children, openByDefault = true }: { readonly title: string; readonly action?: ReactNode; readonly children: ReactNode; readonly openByDefault?: boolean }) {
  const [isOpen, setIsOpen] = useState(openByDefault);
  return (
    <section className="property-section">
      <div className="section-heading">
        <button className="section-toggle" onClick={() => setIsOpen(!isOpen)}><Icon className={isOpen ? "chevron-open" : ""} name="chevron" size={14} /><span>{title}</span></button>
        {action}
      </div>
      {isOpen ? <div className="section-content">{children}</div> : null}
    </section>
  );
}

export function NumberInput({ label, value, mixed = false, onCommit, min, max, step = 1, icon }: {
  readonly label: string;
  readonly value: number;
  readonly mixed?: boolean;
  readonly onCommit: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly icon?: string;
}) {
  const [draft, setDraft] = useState(mixed ? "Mixed" : String(Math.round(value * 100) / 100));
  useEffect(() => setDraft(mixed ? "Mixed" : String(Math.round(value * 100) / 100)), [mixed, value]);
  const commit = (): void => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) { setDraft(mixed ? "Mixed" : String(value)); return; }
    onCommit(Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, parsed)));
  };
  return (
    <label className="field numeric-field" title={label}>
      <span className="field-prefix">{icon ?? label}</span>
      <input inputMode="decimal" step={step} type="number" value={draft} placeholder={mixed ? "Mixed" : undefined} onBlur={commit} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
    </label>
  );
}

export function TextInput({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { readonly label: string }) {
  return <label className="field text-field" title={label}><span className="sr-only">{label}</span><input {...props} /></label>;
}

export function SegmentedControl<T extends string>({ value, options, onChange }: { readonly value: T; readonly options: readonly { value: T; label: string; icon?: IconName }[]; readonly onChange: (value: T) => void }) {
  return <div className="segmented-control">{options.map((option) => <button className={value === option.value ? "is-active" : ""} key={option.value} onClick={() => onChange(option.value)}>{option.icon ? <Icon name={option.icon} size={15} /> : option.label}</button>)}</div>;
}
