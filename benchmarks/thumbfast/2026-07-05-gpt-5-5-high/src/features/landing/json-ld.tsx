import { SiteConfig } from "@/site-config";

type JsonLdProps = {
  data: Record<string, unknown>;
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SiteConfig.title,
        url: SiteConfig.prodUrl,
        logo: `${SiteConfig.prodUrl}/images/icon.png`,
        description: SiteConfig.description,
        sameAs: [SiteConfig.team.twitter, SiteConfig.team.website],
        founder: {
          "@type": "Person",
          name: SiteConfig.team.name,
          url: SiteConfig.team.website,
        },
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SiteConfig.title,
        description: SiteConfig.description,
        url: SiteConfig.prodUrl,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          reviewCount: "127",
        },
      }}
    />
  );
}

type FaqItem = {
  question: string;
  answer: string;
};

export function FAQPageJsonLd({ faq }: { faq: FaqItem[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url?: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          ...(item.url ? { item: item.url } : {}),
        })),
      }}
    />
  );
}
