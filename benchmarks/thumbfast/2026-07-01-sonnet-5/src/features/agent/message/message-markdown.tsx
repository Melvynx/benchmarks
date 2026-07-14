"use client";

import { ClientMarkdown } from "@/features/markdown/client-markdown";

export function MessageMarkdown({ text }: { text: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ClientMarkdown
        options={{
          forceBlock: true,
          overrides: {
            p: {
              props: { className: "mb-2 last:mb-0 whitespace-pre-wrap" },
            },
            ul: {
              props: { className: "mb-2 list-disc pl-5 last:mb-0" },
            },
            ol: {
              props: { className: "mb-2 list-decimal pl-5 last:mb-0" },
            },
            li: {
              props: { className: "mb-1 last:mb-0" },
            },
            strong: {
              props: { className: "font-semibold" },
            },
            em: {
              props: { className: "italic" },
            },
            code: {
              props: {
                className:
                  "bg-muted/60 rounded px-1 py-0.5 text-[12px] font-mono",
              },
            },
            a: {
              props: {
                className: "text-primary underline underline-offset-2",
                target: "_blank",
                rel: "noopener noreferrer",
              },
            },
          },
        }}
      >
        {text}
      </ClientMarkdown>
    </div>
  );
}
