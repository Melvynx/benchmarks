const effortLabels = {
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "X-High",
  max: "Max",
  ultra: "Ultra",
} as const

export function effortLabel(effort: string) {
  const normalizedEffort = effort.trim().toLowerCase()
  const label =
    effortLabels[normalizedEffort as keyof typeof effortLabels] ?? "-"

  return `Thinking: ${label}`
}
