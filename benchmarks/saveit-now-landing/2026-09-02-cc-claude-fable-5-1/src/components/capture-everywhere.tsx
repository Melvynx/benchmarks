import { ArrowUpRightIcon } from "lucide-react";

import { campaignImages } from "../lib/campaign-images";
import { links } from "../lib/links";
import { LinkButton } from "./ui/button";
import { CampaignPicture } from "./ui/campaign-picture";
import { Reveal } from "./ui/reveal";

const clips = [
  {
    id: "pin",
    gif: "/docs/pin-extensions.gif",
    title: "Pin the extension",
    body: "Chrome and Firefox. One icon in your toolbar.",
  },
  {
    id: "page",
    gif: "/docs/save-link.gif",
    title: "Save any page",
    body: "Articles, videos, posts, and PDFs in one click.",
  },
  {
    id: "image",
    gif: "/docs/save-image2.gif",
    title: "Save any image",
    body: "Right click a picture and it joins your library.",
  },
];

export function CaptureEverywhere() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8 lg:pb-32">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal
          variant="left"
          className="relative flex min-h-[320px] flex-col justify-end overflow-hidden rounded-[28px] border border-white/10 p-6 sm:p-8"
        >
          <CampaignPicture
            image={campaignImages.portalArch}
            sizes="(min-width: 1024px) 420px, 100vw"
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
          <div className="relative">
            <p className="section-eyebrow">Capture</p>
            <h2 className="font-display mt-4 text-3xl leading-[1.05] text-cream sm:text-4xl">
              Save from where you <em className="text-ember-soft">already are.</em>
            </h2>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-cream/75">
              Browser, phone, or web app. Every door leads to the same home.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton href={links.extensions} variant="outline">
                Get the extension
                <ArrowUpRightIcon className="size-4" aria-hidden />
              </LinkButton>
              <LinkButton href="#ios" variant="ghost">
                iOS app
              </LinkButton>
            </div>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-3">
          {clips.map((clip, index) => (
            <Reveal
              key={clip.id}
              delay={index * 90}
              className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition-colors hover:bg-white/[0.05]"
            >
              <div className="aspect-[16/9] w-full overflow-hidden border-b border-white/10 bg-ink-3">
                <img
                  src={clip.gif}
                  alt={`Short recording: ${clip.title.toLowerCase()} in the SaveIt.now browser extension`}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="text-[15px] font-medium text-cream">
                  {clip.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-mist">
                  {clip.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
