export function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | "Mixed";
  onChange: (n: number) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        value={value === "Mixed" ? "Mixed" : String(value)}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </div>
  );
}
