type TimestampedRecord = {
  type?: unknown
  subtype?: unknown
  timestamp_ms?: unknown
}

const BACKGROUND_WAIT_THRESHOLD_MS = 30_000

/**
 * Cursor keeps an agent session open while a background task is running, then
 * emits a task_notification when that process exits. Those silent waits are
 * real wall time but not active model/tool work.
 */
export function activeTranscriptDurationMs(transcript: string) {
  const records: Array<Required<Pick<TimestampedRecord, "type" | "subtype">> & {
    timestamp: number
  }> = []

  for (const line of transcript.split("\n")) {
    if (!line.trim()) continue
    try {
      const record = JSON.parse(line) as TimestampedRecord
      if (
        typeof record.timestamp_ms !== "number" ||
        !Number.isFinite(record.timestamp_ms)
      )
        continue
      records.push({
        type: record.type ?? null,
        subtype: record.subtype ?? null,
        timestamp: record.timestamp_ms,
      })
    } catch {
      // Ignore malformed diagnostic lines in otherwise useful transcripts.
    }
  }

  if (records.length < 2) return null

  let duration = 0
  for (let index = 1; index < records.length; index += 1) {
    const previous = records[index - 1]
    const current = records[index]
    const gap = Math.max(0, current.timestamp - previous.timestamp)
    const backgroundWait =
      gap > BACKGROUND_WAIT_THRESHOLD_MS &&
      previous.type === "thinking" &&
      previous.subtype === "completed" &&
      current.type === "system" &&
      current.subtype === "task_notification"

    if (!backgroundWait) duration += gap
  }

  return duration
}
