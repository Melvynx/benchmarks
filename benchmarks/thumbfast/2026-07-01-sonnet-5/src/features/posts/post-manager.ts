import fm from "front-matter";
import { z } from "zod";
import { isViteProd } from "@/lib/public-env";

const postFiles = import.meta.glob("../../../content/posts/*.mdx", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const AttributeSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  status: z.enum(["draft", "published"]),
  coverUrl: z.string(),
  tags: z.array(z.string()).optional(),
  date: z.coerce.date(),
});

type PostAttributes = z.infer<typeof AttributeSchema> & {
  date: Date;
};

export type Post = {
  slug: string;
  attributes: PostAttributes;
  content: string;
};

export const getPosts = async (tags?: string[]) => {
  const posts: Post[] = [];
  for (const [filePath, fileContents] of Object.entries(postFiles)) {
    const fileName = filePath.split("/").at(-1);
    if (!fileName) {
      continue;
    }
    const matter = fm(fileContents);

    const result = AttributeSchema.safeParse(matter.attributes);

    if (!result.success) {
      continue;
    }

    if (isViteProd() && result.data.status === "draft") {
      continue;
    }

    if (tags) {
      if (!result.data.tags?.some((tag) => tags.includes(tag))) {
        continue;
      }
    }

    posts.push({
      slug: fileName.replace(".mdx", "").replace(/^\d+-/, ""),
      content: matter.body,
      attributes: {
        ...result.data,
      },
    });
  }

  return posts;
};

export const getPostsTags = async () => {
  const posts = await getPosts();
  const tags = new Set<string>();
  for (const post of posts) {
    if (!post.attributes.tags) {
      continue;
    }
    for (const tag of post.attributes.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
};

export type PostParams = PageProps<"/posts/[slug]">;

export const getCurrentPost = async (slug: string) => {
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug);
};
