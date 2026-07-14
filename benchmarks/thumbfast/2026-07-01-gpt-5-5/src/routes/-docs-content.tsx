import { Typography } from "@/components/nowts/typography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServerMdx } from "@/features/markdown/server-mdx";
import { absoluteUrl } from "@/lib/utils";
import { DocsApiExamples } from "@public-site/docs/_components/docs-api-examples";
import { DocsCopyPage } from "@public-site/docs/_components/docs-copy-page";
import { DocsHeader } from "@public-site/docs/_components/docs-header";
import { DocsSidebar } from "@public-site/docs/_components/docs-sidebar";
import {
  DocsTableOfContents,
  type TocItem,
} from "@public-site/docs/_components/docs-toc";
import type { DocTree, DocType } from "@public-site/docs/doc-manager";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import Link from "@/compat/link";
import type { ReactNode } from "react";

export function DocsShell(props: { tree: DocTree; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DocsHeader />
      <div className="flex flex-1">
        <DocsSidebar tree={props.tree} />
        <main className="flex-1">{props.children}</main>
      </div>
    </div>
  );
}

export function DocsNotFound(props: { tree: DocTree }) {
  return (
    <DocsShell tree={props.tree}>
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Typography variant="h1">Page not found</Typography>
        <Typography variant="muted" className="mt-3">
          This documentation page does not exist.
        </Typography>
      </div>
    </DocsShell>
  );
}

export function DocsContent(props: {
  tree: DocTree;
  doc: DocType;
  allDocs: DocType[];
}) {
  const currentIndex = props.allDocs.findIndex(
    (doc) => doc.slug === props.doc.slug,
  );
  const neighbours = {
    previous: currentIndex > 0 ? props.allDocs[currentIndex - 1] : null,
    next:
      currentIndex < props.allDocs.length - 1
        ? props.allDocs[currentIndex + 1]
        : null,
  };
  const method = props.doc.attributes.method as
    | "GET"
    | "POST"
    | "PATCH"
    | "DELETE"
    | "PUT"
    | undefined;
  const { endpoint, examples, results, links } = props.doc.attributes;
  const hasApiExamples = method ?? endpoint ?? examples ?? results;
  const toc = extractToc(props.doc.content);

  return (
    <DocsShell tree={props.tree}>
      <div
        className={
          hasApiExamples ? "xl:pr-[800px]" : toc.length > 0 ? "xl:pr-64" : ""
        }
      >
        <div className="flex w-full">
          <div className="flex min-w-0 flex-1">
            <div className="mx-auto px-6 py-8">
              <div className="mx-auto flex max-w-prose flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <Typography
                      variant="h1"
                      className="flex-1 text-4xl font-bold tracking-tight"
                    >
                      {props.doc.attributes.title}
                    </Typography>
                    <div className="shrink-0">
                      <DocsCopyPage
                        page={props.doc.content}
                        url={absoluteUrl(props.doc.url)}
                      />
                    </div>
                  </div>
                  {props.doc.attributes.description && (
                    <Typography
                      variant="p"
                      className="text-muted-foreground text-lg"
                    >
                      {props.doc.attributes.description}
                    </Typography>
                  )}
                  {links && (
                    <div className="flex items-center gap-2">
                      {links.doc && (
                        <Badge asChild variant="secondary">
                          <Link
                            href={links.doc}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Docs <ExternalLink className="size-3" />
                          </Link>
                        </Badge>
                      )}
                      {links.api && (
                        <Badge asChild variant="secondary">
                          <Link
                            href={links.api}
                            target="_blank"
                            rel="noreferrer"
                          >
                            API Reference <ExternalLink className="size-3" />
                          </Link>
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <ServerMdx source={props.doc.content} />

                <div className="border-border flex items-center justify-between border-t pt-6">
                  {neighbours.previous && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={neighbours.previous.url}>
                        <ArrowLeft className="size-4" />
                        {neighbours.previous.attributes.title}
                      </Link>
                    </Button>
                  )}
                  {neighbours.next && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      asChild
                    >
                      <Link href={neighbours.next.url}>
                        {neighbours.next.attributes.title}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="fixed top-16 right-0 hidden h-[calc(100vh-4rem)] overflow-y-auto xl:flex">
            {hasApiExamples && (
              <aside className="bg-background w-96 overflow-y-auto border-l">
                <div className="p-6">
                  <DocsApiExamples
                    method={method}
                    endpoint={endpoint}
                    examples={examples}
                    results={results}
                  />
                </div>
              </aside>
            )}

            {toc.length > 0 && (
              <aside className="bg-background w-64 overflow-y-auto border-l">
                <div className="p-6">
                  <DocsTableOfContents toc={toc} />
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </DocsShell>
  );
}

function extractToc(content: string): TocItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const depth = match[1].length;
    const title = match[2].trim();
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    toc.push({
      title,
      url: `#${slug}`,
      depth,
    });
  }

  return toc;
}
