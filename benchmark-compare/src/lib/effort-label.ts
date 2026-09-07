// A run records whatever effort its harness accepted, so the lookup is open at
// the type level and an unknown level degrades to a placeholder.
const effortLabels: Record<string, string | undefined> = {
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "X-High",
  max: "Max",
  ultra: "Ultra",
}

export function effortLabel(effort: string) {
  const label = effortLabels[effort.trim().toLowerCase()] ?? "-"

  return `Thinking: ${label}`
}
