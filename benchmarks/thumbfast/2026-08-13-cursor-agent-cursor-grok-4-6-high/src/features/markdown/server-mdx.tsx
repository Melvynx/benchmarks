import {
  DocCard,
  DocCardGrid,
  DocCardWrapper,
  DocSection,
} from "@public-site/docs/_components/doc-card";
import { cn } from "@/lib/utils";
import Markdown, { type MarkdownToJSX } from "markdown-to-jsx";
import { rehypePlugins, remarkPlugins } from "./markdown.config";

type ServerMdxProps = {
  source: string;
  className?: string;
};

const MdxComponent = {
  DocCard,
  DocCardGrid,
  DocSection,
  DocCardWrapper,
} satisfies MarkdownToJSX.Overrides;

export const ServerMdx = (props: ServerMdxProps) => {
  return (
    <div className={cn("typography", props.className)}>
      <RenderMdx {...props} />
    </div>
  );
};

const RenderMdx = (props: ServerMdxProps) => {
  return (
    <Markdown
      options={{
        forceBlock: true,
        overrides: MdxComponent,
        wrapper: "div",
        slugify: (value) =>
          value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
      }}
    >
      {props.source}
    </Markdown>
  );
};

void remarkPlugins;
void rehypePlugins;
