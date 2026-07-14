export const SiteConfig = {
  title: "Thumbfa.st",
  description: "Create stunning AI-powered YouTube thumbnails in seconds",
  prodUrl: "https://thumbfa.st",
  appId: "thumbfast",
  domain: "thumbfa.st",
  appIcon: "/images/icon.png",
  ogImage: "/og-image.png",
  company: {
    name: "Codelynx, LLC",
    siteUrl: "https://codelynx.dev",
    address: "8 The Green STE B, Dover Delaware 19901, United States",
  },
  brand: {
    primary: "#FF0000",
  },
  team: {
    image: "https://melvynx.com/images/me/twitter-en.jpg",
    website: "https://melvynx.com",
    twitter: "https://twitter.com/melvyn_me",
    twitterHandle: "@melvyn_me",
    name: "Melvynx",
  },
  features: {
    /**
     * If enable, you need to specify the logic of upload here : src/features/images/uploadImageAction.tsx
     * You can use Vercel Blob Storage : https://vercel.com/docs/storage/vercel-blob
     * Or you can use Cloudflare R2 : https://mlv.sh/cloudflare-r2-tutorial
     * Or you can use AWS S3 : https://mlv.sh/aws-s3-tutorial
     */
    enableImageUpload: false as boolean,
    /**
     * If enable, the user will be redirected to `/orgs` when he visits the landing page at `/`
     * The logic is located in middleware.ts
     */
    enableLandingRedirection: true as boolean,
  },
};
