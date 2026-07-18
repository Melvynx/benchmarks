export type AdminNotificationDetail = {
  label: string;
  value?: string | number | boolean | null;
};

const MAX_MESSAGE_LENGTH = 3500;
const MAX_TITLE_LENGTH = 160;
const MAX_LABEL_LENGTH = 80;
const MAX_DETAIL_VALUE_LENGTH = 900;
const MAX_CONTEXT_VALUE_LENGTH = 200;
const TRUNCATED_NOTICE = "[message truncated]";

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function stringifyDetail(
  value: AdminNotificationDetail["value"],
  maxLength = MAX_DETAIL_VALUE_LENGTH,
) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return truncateText(String(value), maxLength);
}

function hasDetailValue(value: AdminNotificationDetail["value"]) {
  return value !== undefined && value !== null && value !== "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function code(
  value: AdminNotificationDetail["value"],
  maxLength = MAX_DETAIL_VALUE_LENGTH,
) {
  return `<code>${escapeHtml(stringifyDetail(value, maxLength))}</code>`;
}

function formatTimestamp(date: Date) {
  return `${date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "")} UTC`;
}

function getEventSummary(event: string) {
  const summaries: Record<string, string> = {
    "billing.churn_scheduled": "A customer scheduled a subscription cancellation.",
    "billing.churned": "A customer canceled their subscription.",
    "billing.paid_upgrade": "A customer upgraded to a paid plan.",
    "billing.subscription_created": "A new subscription was created.",
    "billing.subscription_updated": "A subscription changed.",
    "convex.server_error": "A Convex backend error needs attention.",
    "server.route_error": "A server route failed.",
  };
  return summaries[event] ?? "Thumbfa.st sent you an admin event.";
}

function getMessageLength(lines: string[]) {
  return lines.join("\n").length;
}

function canFit(lines: string[], nextLines: string[]) {
  return getMessageLength([...lines, ...nextLines]) <= MAX_MESSAGE_LENGTH;
}

export function buildAdminNotificationMessage(args: {
  event: string;
  title: string;
  environment: string;
  details?: AdminNotificationDetail[];
  now?: Date;
}) {
  const details = (args.details ?? []).filter((detail) =>
    hasDetailValue(detail.value),
  );
  const timestampLines = [
    "",
    `<b>Time</b>`,
    code(formatTimestamp(args.now ?? new Date()), MAX_CONTEXT_VALUE_LENGTH),
  ];
  const lines = [
    `<b>Thumbfa.st admin alert</b>`,
    `<b>${escapeHtml(truncateText(args.title, MAX_TITLE_LENGTH))}</b>`,
    escapeHtml(getEventSummary(args.event)),
    "",
    `<b>Context</b>`,
    `• Event: ${code(args.event, MAX_CONTEXT_VALUE_LENGTH)}`,
    `• Environment: ${code(args.environment, MAX_CONTEXT_VALUE_LENGTH)}`,
  ];

  if (details.length > 0) {
    lines.push("", `<b>Details</b>`);
    for (const detail of details) {
      const detailLine = `• ${escapeHtml(
        truncateText(detail.label, MAX_LABEL_LENGTH),
      )}: ${code(detail.value)}`;
      if (!canFit(lines, [detailLine, ...timestampLines])) {
        if (canFit(lines, [TRUNCATED_NOTICE, ...timestampLines])) {
          lines.push(TRUNCATED_NOTICE);
        }
        break;
      }
      lines.push(detailLine);
    }
  }

  lines.push(...timestampLines);
  return lines.join("\n");
}
