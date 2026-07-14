import fm from "front-matter";
import { z } from "zod";
import { isViteProd } from "@/lib/public-env";

const changelogFiles = import.meta.glob("../../../content/changelog/*.mdx", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const AttributeSchema = z.object({
  date: z.coerce.date(),
  version: z.string().optional(),
  title: z.string().optional(),
  image: z.string().nullable().optional(),
  videoUrl: z.string().optional(),
  status: z.enum(["draft", "published"]).default("published"),
});

type ChangelogAttributes = z.infer<typeof AttributeSchema>;

export type Changelog = {
  slug: string;
  attributes: ChangelogAttributes;
  content: string;
};

export const getChangelogs = async (): Promise<Changelog[]> => {
  try {
    const changelogPromises = Object.entries(changelogFiles).map(
      async ([filePath, fileContents]) => {
        const fileName = filePath.split("/").at(-1);
        if (!fileName) {
          return null;
        }

        const matter = fm(fileContents);
        const result = AttributeSchema.safeParse(matter.attributes);

        if (!result.success) {
          return null;
        }

        if (isViteProd() && result.data.status === "draft") {
          return null;
        }

        return {
          slug: fileName.replace(".mdx", ""),
          content: matter.body,
          attributes: result.data,
        } satisfies Changelog;
      },
    );

    const results = await Promise.all(changelogPromises);
    const changelogs = results.filter((c): c is Changelog => c !== null);

    return changelogs.sort(
      (a, b) =>
        new Date(b.attributes.date).getTime() -
        new Date(a.attributes.date).getTime(),
    );
  } catch {
    return [];
  }
};

export type ChangelogParams = {
  params: Promise<{ slug: string }>;
};

export const getCurrentChangelog = async (
  slug: string,
): Promise<Changelog | undefined> => {
  const changelogs = await getChangelogs();
  return changelogs.find((c) => c.slug === slug);
};
