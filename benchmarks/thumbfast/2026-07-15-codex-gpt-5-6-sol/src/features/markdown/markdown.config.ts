import rehypeShiki from "@shikijs/rehype";
import rehypeAutolinkHeading from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

const shikiPlugin = [
  rehypeShiki,
  {
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  },
] satisfies PluggableList[number];

export const rehypePlugins = [
  shikiPlugin,
  rehypeSlug,
  rehypeAutolinkHeading,
] satisfies PluggableList;

export const remarkPlugins = [remarkGfm] satisfies PluggableList;
