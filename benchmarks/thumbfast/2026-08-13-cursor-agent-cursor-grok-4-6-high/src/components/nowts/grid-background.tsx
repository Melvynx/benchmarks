type GridBackgroundProps = {
  size?: number; // grid square size in px
  color?: string; // grid line color
  className?: string;
};

export default function GridBackground({
  size = 8,
  color = "rgba(0,0,0,0.04)",
  className = "",
}: GridBackgroundProps) {
  const SQUARE_SIZE = Math.max(1, Math.round(size));
  const SQUARE_COLOR = color;
  const offset = SQUARE_SIZE + 0.5;
  const double = SQUARE_SIZE * 2;

  const backgroundImage = `repeating-linear-gradient(0deg, transparent 0, transparent ${SQUARE_SIZE}px, ${SQUARE_COLOR} ${SQUARE_SIZE}px, ${SQUARE_COLOR} ${offset}px, transparent ${offset}px, transparent ${double}px), repeating-linear-gradient(90deg, transparent 0, transparent ${SQUARE_SIZE}px, ${SQUARE_COLOR} ${SQUARE_SIZE}px, ${SQUARE_COLOR} ${offset}px, transparent ${offset}px, transparent ${double}px)`;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 h-full w-full ${className}`}
      style={{ backgroundImage }}
    />
  );
}
