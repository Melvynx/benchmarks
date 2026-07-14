import { DocsContent, DocsNotFound } from "../-docs-content";
import {
  getAllDocs,
  getCurrentDoc,
  getDocsTree,
} from "@public-site/docs/doc-manager";
import { createPageHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/")({
  loader: async () => {
    const [tree, doc, allDocs] = await Promise.all([
      getDocsTree(),
      getCurrentDoc([]),
      getAllDocs(),
    ]);
    return { tree, doc, allDocs };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return createPageHead({
        title: "Documentation",
        description: "Documentation and guides for Thumbfa.st.",
        path: "/docs",
      });
    }

    const currentDoc =
      loaderData.doc ??
      loaderData.tree.rootDocs.at(0) ??
      loaderData.allDocs.at(0);

    return createPageHead({
      title: currentDoc
        ? `${currentDoc.attributes.title} Docs`
        : "Documentation",
      description:
        currentDoc?.attributes.description ??
        "Documentation and guides for Thumbfa.st.",
      keywords: currentDoc?.attributes.keywords,
      image: currentDoc?.attributes.coverUrl,
      path: currentDoc?.url ?? "/docs",
    });
  },
  component: DocsIndexRoute,
});

function DocsIndexRoute() {
  const { tree, allDocs } = Route.useLoaderData();
  const currentDoc = tree.rootDocs.at(0) ?? allDocs.at(0);

  if (!currentDoc) {
    return <DocsNotFound tree={tree} />;
  }

  return <DocsContent tree={tree} doc={currentDoc} allDocs={allDocs} />;
}
