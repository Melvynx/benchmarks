const SITE_TITLE = "Thumbfa.st";
const BRAND_PRIMARY = "#FF0000";
const SITE_URL = "https://thumbfa.st";
const APP_ICON_URL = `${SITE_URL}/images/icon.png`;

export type MarkdownEmailBadgeVariant = "brand" | "dark";

export type MarkdownEmailParams = {
  preview: string;
  markdown: string;
  badgeLabel?: string;
  badgeImageUrl?: string | null;
  badgeVariant?: MarkdownEmailBadgeVariant;
  heroImageUrl?: string | null;
};

type MarkdownBlock =
  | { type: "markdown"; content: string }
  | { type: "button"; label: string; url: string };

const buttonLinkPattern =
  /^\[([^\]]+)\]\((\S+)\s+(?:"button"|'button'|"primary-button"|'primary-button')\)$/i;

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeAttribute = (value: string) =>
  escapeHtml(value).replaceAll("\n", " ");

const normalizeMarkdown = (markdown: string) =>
  markdown
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

const splitMarkdownBlocks = (content: string): MarkdownBlock[] => {
  const blocks: MarkdownBlock[] = [];
  const markdownLines: string[] = [];

  const flushMarkdown = () => {
    const markdown = markdownLines.join("\n").trim();
    if (markdown) {
      blocks.push({ type: "markdown", content: markdown });
    }
    markdownLines.length = 0;
  };

  for (const line of content.split("\n")) {
    const buttonMatch = line.match(buttonLinkPattern);
    if (!buttonMatch) {
      markdownLines.push(line);
      continue;
    }

    flushMarkdown();
    blocks.push({
      type: "button",
      label: buttonMatch[1],
      url: buttonMatch[2],
    });
  }

  flushMarkdown();
  return blocks;
};

const inlineCodeStyle =
  "background-color:#f1f5f9;border-radius:6px;color:#0f172a;padding:2px 5px;";
const linkStyle = `color:${BRAND_PRIMARY};font-weight:600;text-decoration:none;`;
const paragraphStyle =
  "color:#475569;font-size:16px;line-height:1.6;margin:0 0 16px;text-align:center;";
const listStyle =
  "color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px;padding-left:24px;";
const listItemStyle =
  "color:#475569;font-size:16px;line-height:1.6;margin:0 0 8px;";

const renderInlineMarkdown = (value: string) => {
  let rendered = escapeHtml(value);
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  rendered = rendered.replace(
    /`([^`]+)`/g,
    `<code class="inline-code" style="${inlineCodeStyle}">$1</code>`,
  );
  rendered = rendered.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    `<a href="$2" style="${linkStyle}">$1</a>`,
  );
  return rendered;
};

const renderMarkdownBlock = (content: string) => {
  const lines = content.split("\n");
  const parts: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] = [];
  let inCode = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    parts.push(
      `<p style="${paragraphStyle}">${renderInlineMarkdown(paragraph.join(" "))}</p>`,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    parts.push(
      `<ul style="${listStyle}">${list.map((item) => `<li style="${listItemStyle}">${renderInlineMarkdown(item)}</li>`).join("")}</ul>`,
    );
    list = [];
  };

  const flushCode = () => {
    if (!code.length) return;
    const codeValue = escapeHtml(code.join("\n").trim());
    parts.push(
      `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:10px auto 26px;"><tr><td style="background-color:#fff7f7;border:1px solid #ffd6d6;border-radius:14px;color:#111827;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;font-weight:800;letter-spacing:9px;line-height:1;padding:18px 28px;text-align:center;">${codeValue}</td></tr></table>`,
    );
    code = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith("# ")) {
      flushParagraph();
      flushList();
      parts.push(
        `<h1 style="color:#111827;font-size:26px;font-weight:800;line-height:1.25;margin:18px 0 10px;text-align:center;">${renderInlineMarkdown(line.slice(2))}</h1>`,
      );
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushCode();

  return parts.join("");
};

const stripMarkdownForText = (markdown: string) =>
  markdown
    .replace(/```/g, "")
    .replace(/^#\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+['"][^'"]+['"])?\)/g, "$1: $2")
    .trim();

export const renderMarkdownEmail = ({
  preview,
  markdown,
  badgeLabel = SITE_TITLE,
  badgeImageUrl,
  badgeVariant = "brand",
  heroImageUrl,
}: MarkdownEmailParams) => {
  const normalizedMarkdown = normalizeMarkdown(markdown);
  const blocks = splitMarkdownBlocks(normalizedMarkdown);
  const badgeBackground = badgeVariant === "brand" ? BRAND_PRIMARY : "#0f172a";
  const badgeInitial =
    badgeLabel.trim().charAt(0).toUpperCase() || SITE_TITLE.charAt(0);
  const badge = badgeImageUrl
    ? `<img alt="${escapeAttribute(badgeLabel)} logo" src="${escapeAttribute(badgeImageUrl)}" width="56" height="56" style="border:1px solid #fee2e2;border-radius:16px;display:inline-block;height:56px;object-fit:cover;width:56px;" />`
    : `<span style="background-color:${badgeBackground};border:1px solid #fee2e2;border-radius:16px;color:#ffffff;display:inline-block;font-size:22px;font-weight:800;height:56px;line-height:56px;margin:0;text-align:center;width:56px;">${escapeHtml(badgeInitial)}</span>`;
  const badgeMarkup =
    badgeImageUrl === APP_ICON_URL && badgeLabel === SITE_TITLE
      ? ""
      : `<div class="badge-wrap">${badge}</div>`;
  const brandHeader = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 28px;"><tr><td align="center"><a href="${SITE_URL}" style="color:#111827;text-decoration:none;"><img alt="${SITE_TITLE} logo" src="${APP_ICON_URL}" width="32" height="32" style="border:0;border-radius:9px;display:inline-block;height:32px;margin:0 8px -8px 0;vertical-align:middle;width:32px;" /><span style="color:#111827;display:inline-block;font-size:20px;font-weight:800;line-height:32px;vertical-align:middle;">${SITE_TITLE}</span></a></td></tr></table>`;
  const heroMarkup = heroImageUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 24px;"><tr><td align="center"><img alt="${escapeAttribute(badgeLabel)} preview" src="${escapeAttribute(heroImageUrl)}" style="border:1px solid #e5e7eb;border-radius:14px;display:block;height:auto;max-width:100%;width:100%;" /></td></tr></table>`
    : "";

  const htmlBlocks = blocks
    .map((block) => {
      if (block.type === "button") {
        return `<div class="action-wrap"><a class="primary-action-button" href="${escapeAttribute(block.url)}">${escapeHtml(block.label)}</a></div>`;
      }

      return renderMarkdownBlock(block.content);
    })
    .join("");
  const text = blocks
    .map((block) =>
      block.type === "button"
        ? `${block.label}: ${block.url}`
        : stripMarkdownForText(block.content),
    )
    .join("\n\n")
    .trim();

  return {
    text,
    html: `<!doctype html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(preview)}</title>
<style>
body{background-color:#f6f7fb;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;margin:0;padding:0;}
.email-shell{background-color:#f6f7fb;padding:42px 16px;}
.container{background-color:#ffffff;border:1px solid #e5e7eb;border-radius:18px;margin:0 auto;max-width:560px;padding:34px 40px 28px;}
.badge-wrap{margin:0 0 6px;text-align:center;}
h1{color:#111827;font-size:26px;font-weight:800;line-height:1.25;margin:18px 0 10px;text-align:center;}
p{color:#475569;font-size:16px;line-height:1.6;margin:0 0 16px;text-align:center;}
strong{color:#111827;font-weight:800;}
a{color:${BRAND_PRIMARY};font-weight:600;text-decoration:none;}
.action-wrap{margin:24px 0 28px;text-align:center;}
.primary-action-button{background-color:${BRAND_PRIMARY};border-radius:10px;color:#ffffff!important;display:inline-block;font-size:16px;font-weight:800;line-height:1;padding:14px 22px;text-decoration:none;}
.inline-code{background-color:#f1f5f9;border-radius:6px;color:#0f172a;padding:2px 5px;}
ul{color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px;padding-left:24px;}
li{color:#475569;font-size:16px;line-height:1.6;margin:0 0 8px;}
.footer{color:#94a3b8;font-size:12px;line-height:1.5;margin:24px auto 0;max-width:560px;text-align:center;}
</style>
</head>
<body>
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preview)}</span>
<div class="email-shell" style="background-color:#f6f7fb;padding:42px 16px;">
<div class="container">
${brandHeader}
${heroMarkup}
${badgeMarkup}
${htmlBlocks}
</div>
<p class="footer">Sent by ${SITE_TITLE} - if you weren't expecting this email, you can ignore it.</p>
</div>
</body>
</html>`,
  };
};

export const defaultMarkdownEmailBadgeImageUrl = APP_ICON_URL;
