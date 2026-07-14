import { absoluteUrl, type PageMetadata, withSiteTitle } from "@/lib/metadata";
import { SiteConfig } from "@/site-config";
import { useEffect } from "react";

export function usePageMetadata(metadata: PageMetadata | null | undefined) {
  const title = metadata?.title;
  const description = metadata?.description;
  const image = metadata?.image;
  const path = metadata?.path;
  const noIndex = metadata?.noIndex;

  useEffect(() => {
    if (!title || typeof document === "undefined") return;

    const resolvedTitle = withSiteTitle(title);
    const resolvedDescription = description ?? SiteConfig.description;
    const resolvedImage = absoluteUrl(image ?? SiteConfig.ogImage);

    document.title = resolvedTitle;
    upsertMeta("name", "description", resolvedDescription);
    upsertMeta("property", "og:title", resolvedTitle);
    upsertMeta("property", "og:description", resolvedDescription);
    upsertMeta("property", "og:image", resolvedImage);
    upsertMeta("name", "twitter:title", resolvedTitle);
    upsertMeta("name", "twitter:description", resolvedDescription);
    upsertMeta("name", "twitter:image", resolvedImage);

    if (path) {
      upsertMeta("property", "og:url", absoluteUrl(path));
      if (noIndex) {
        removeCanonical();
      } else {
        upsertCanonical(absoluteUrl(path));
      }
    } else if (noIndex) {
      removeCanonical();
    }
  }, [description, image, noIndex, path, title]);
}

function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string,
) {
  const selector = `meta[${attribute}="${escapeAttributeSelector(key)}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function removeCanonical() {
  document.head.querySelector('link[rel="canonical"]')?.remove();
}

function escapeAttributeSelector(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
