import { DocsContent, DocsNotFound } from "../-docs-content";
import {
  getAllDocs,
  getCurrentDoc,
  getDocsTree,
} from "@public-site/docs/doc-manager";
import { createPageHead } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/$")({
  loader: async ({ params }) => {
    const slug = params._splat ? params._splat.split("/") : [];
    const [tree, doc, allDocs] = await Promise.all([
      getDocsTree(),
      getCurrentDoc(slug),
      getAllDocs(),
    ]);
    return { tree, doc, allDocs };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return createPageHead({
        title: "Documentation",
        description: "Documentation and guides for Thumbfa.st.",
        path: params._splat ? `/docs/${params._splat}` : "/docs",
      });
    }

    const currentDoc =
      loaderData.doc ??
      loaderData.tree.rootDocs.at(0) ??
      loaderData.allDocs.at(0);
    const path = params._splat ? `/docs/${params._splat}` : "/docs";

    return createPageHead({
      title: currentDoc
        ? `${currentDoc.attributes.title} Docs`
        : "Documentation",
      description:
        currentDoc?.attributes.description ??
        "Documentation and guides for Thumbfa.st.",
      keywords: currentDoc?.attributes.keywords,
      image: currentDoc?.attributes.coverUrl,
      path,
    });
  },
  component: DocsSplatRoute,
});

function DocsSplatRoute() {
  const { tree, doc, allDocs } = Route.useLoaderData();
  const { _splat } = Route.useParams();
  const currentDoc = _splat ? doc : (tree.rootDocs.at(0) ?? allDocs.at(0));

  if (!currentDoc) {
    return <DocsNotFound tree={tree} />;
  }

  return <DocsContent tree={tree} doc={currentDoc} allDocs={allDocs} />;
}
