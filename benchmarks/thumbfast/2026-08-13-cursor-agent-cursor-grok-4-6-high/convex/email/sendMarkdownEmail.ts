import { up } from "up-fetch";
import {
  renderMarkdownEmail,
  type MarkdownEmailBadgeVariant,
} from "./markdownEmail";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "Thumbfa.st <noreply@thumbfa.st>";
const upfetch = up(fetch);

export type SendMarkdownEmailParams = {
  to: string;
  subject: string;
  markdown: string;
  preview: string;
  badgeLabel?: string;
  badgeImageUrl?: string | null;
  badgeVariant?: MarkdownEmailBadgeVariant;
  heroImageUrl?: string | null;
  replyTo?: string;
};

export async function sendMarkdownEmail(params: SendMarkdownEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false };

  const emailContent = renderMarkdownEmail({
    preview: params.preview,
    markdown: params.markdown,
    badgeLabel: params.badgeLabel,
    badgeImageUrl: params.badgeImageUrl,
    badgeVariant: params.badgeVariant,
    heroImageUrl: params.heroImageUrl,
  });

  await upfetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: {
      from: EMAIL_FROM,
      to: params.to,
      subject:
        process.env.NODE_ENV === "development"
          ? `[DEV] ${params.subject}`
          : params.subject,
      text: emailContent.text,
      html: emailContent.html,
      reply_to: params.replyTo,
    },
  });

  return { sent: true };
}
