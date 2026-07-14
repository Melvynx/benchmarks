import type { Metadata } from "@/lib/metadata";
import { ToolPage } from "../_components/tool-page";
import { getToolPageConfig } from "../_data/tool-pages";

const config = getToolPageConfig("thumbnail-creator");

export const metadata: Metadata = {
  title: config.title,
  description: config.description,
  alternates: { canonical: `/${config.slug}` },
  openGraph: {
    title: config.title,
    description: config.description,
  },
};

export default function Page() {
  return <ToolPage config={config} />;
}
