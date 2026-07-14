import { SiteConfig } from "@/site-config";
import { Markdown, Preview } from "@react-email/components";
import { EmailLayout } from "./utils/email-layout";

export default function MarkdownEmail(props: {
  markdown: string;
  preview?: string;
  disabledSignature?: boolean;
}) {
  let markdown = props.markdown;

  if (!props.disabledSignature) {
    markdown += `

Best,\n
${SiteConfig.team.name} from ${SiteConfig.title}
    `;
  }

  // Normalize markdown by removing leading/trailing spaces from each line
  markdown = markdown
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  return (
    <EmailLayout disableTailwind>
      <Preview>{props.preview ?? "You receive a markdown email."}</Preview>
      <Markdown
        markdownCustomStyles={{
          h1: {
            color: "#0f172a",
            fontSize: "24px",
            fontWeight: "700",
            lineHeight: "1.3",
            margin: "16px 0 8px",
            textAlign: "center",
          },
          p: {
            color: "#475569",
            fontSize: "16px",
            lineHeight: "1.6",
            textAlign: "center",
          },
          li: {
            color: "#475569",
            fontSize: "16px",
            lineHeight: "1.6",
          },
          link: {
            color: SiteConfig.brand.primary,
            fontWeight: "600",
            textDecoration: "none",
          },
          codeInline: {
            backgroundColor: "#f1f5f9",
            borderRadius: "6px",
            color: "#0f172a",
            padding: "2px 5px",
          },
        }}
      >
        {markdown}
      </Markdown>
    </EmailLayout>
  );
}
