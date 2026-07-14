import {
  buildAdminNotificationMessage,
  type AdminNotificationDetail,
} from "@/lib/admin-notification-message";
import { getDiagnosticErrorMessage } from "@/lib/errors/user-facing-error";
import { logger } from "@/lib/logger";
import { upfetch } from "@/lib/up-fetch";

type NotificationDetail = AdminNotificationDetail;

function getEnvironmentLabel() {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
}

export function buildMessage(args: {
  event: string;
  title: string;
  details?: NotificationDetail[];
  now?: Date;
}) {
  return buildAdminNotificationMessage({
    ...args,
    environment: getEnvironmentLabel(),
  });
}

export async function sendAdminTelegramNotification(args: {
  event: string;
  title: string;
  details?: NotificationDetail[];
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return { sent: false, reason: "not_configured" };
  }

  try {
    const data = await upfetch<{
      ok: boolean;
      description?: string;
    }>(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      body: {
        chat_id: chatId,
        text: buildMessage(args),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      },
    });

    if (!data.ok) {
      throw new Error(data.description ?? "Telegram sendMessage failed");
    }

    return { sent: true };
  } catch (error) {
    logger.error("[telegram] Failed to send admin notification", error);
    return { sent: false, reason: "send_failed" };
  }
}

export async function notifyServerError(args: {
  title: string;
  request: Request;
  error: unknown;
  requestId: string;
}) {
  const diagnostic = getDiagnosticErrorMessage(args.error);
  const url = new URL(args.request.url);

  await sendAdminTelegramNotification({
    event: "server.route_error",
    title: args.title,
    details: [
      { label: "Request ID", value: args.requestId },
      { label: "Method", value: args.request.method },
      { label: "Path", value: url.pathname },
      { label: "Error name", value: diagnostic.name },
      { label: "Error", value: diagnostic.message },
    ],
  });
}
