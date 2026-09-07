type Props = {
  /** Two digit index, used as a quiet editorial chapter marker. */
  index: string;
  children: string;
  className?: string;
};

/** Chapter marker that opens each section: a rule, a number, and a label. */
export function SectionLabel({ index, children, className = "" }: Props) {
  return (
    <p
      className={`eyebrow flex items-center gap-3 text-faint ${className}`}
    >
      <span aria-hidden="true" className="h-px w-8 bg-lilac/25" />
      <span className="text-amber/80">{index}</span>
      <span>{children}</span>
    </p>
  );
}
