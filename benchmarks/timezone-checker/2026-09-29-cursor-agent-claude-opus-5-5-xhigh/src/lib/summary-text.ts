import { formatHour, formatHourCount, formatRange, type TimeFormat } from './format';
import type { HourRange, OverlapModel } from './overlap';

function listRanges(ranges: readonly HourRange[], format: TimeFormat, shiftMinutes = 0): string {
  return ranges.map((range) => formatRange(range, format, shiftMinutes)).join(', ');
}

/** Plain-text summary suitable for pasting into Slack, email or a calendar invite. */
export function buildSummaryText(model: OverlapModel, format: TimeFormat): string {
  const { reference } = model;
  if (!reference || !model.isComparing) return '';
  const refName = reference.city.name;

  if (model.mode === 'meeting') {
    if (model.sharedHours.length === 0) {
      const window = `${formatHour(model.window.wakeHour, format)}–${formatHour(model.window.sleepHour, format)}`;
      return `No hour when everyone is awake (awake window ${window}).`;
    }
    return [
      `Everyone is awake for ${formatHourCount(model.sharedHours.length)} (${refName} time): ${listRanges(model.sharedRanges, format)}`,
      ...model.rows.map((row) => `• ${row.city.name}: ${listRanges(model.sharedRanges, format, row.diffMinutes)}`),
    ].join('\n');
  }

  return [
    `Overlap with ${refName} (${refName} time):`,
    ...model.rows.slice(1).map((row) =>
      row.ranges.length === 0
        ? `• ${row.city.name}: no overlap`
        : `• ${row.city.name} — ${formatHourCount(row.overlapHours.length)}: ${listRanges(row.ranges, format)} (${listRanges(row.ranges, format, row.diffMinutes)} local)`,
    ),
  ].join('\n');
}
