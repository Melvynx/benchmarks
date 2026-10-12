import { BellIcon, FingerprintIcon, ShareIcon, SmartphoneIcon, WifiOffIcon, SearchIcon } from "lucide-react";

const points = [
  {
    icon: ShareIcon,
    title: "Save from anywhere on iOS",
    body: "Keep articles, videos, photos and links straight from the share sheet. Two taps and you are back to your day.",
  },
  {
    icon: WifiOffIcon,
    title: "Capture even offline",
    body: "Save on the train or on a trail. Items queue on your iPhone and finish organizing once you are back online.",
  },
  {
    icon: SearchIcon,
    title: "Recall in seconds",
    body: "Search your whole home for bookmarks by meaning, not by exact title. Your wording is enough.",
  },
  {
    icon: FingerprintIcon,
    title: "Private by feel",
    body: "Your library stays yours, protected by Face ID and device level care, with clear controls for what is kept.",
  },
];

export const ExtensionsSection = () => {
  return (
    <section id="ios" className="scroll-mt-20 border-y border-white/10 bg-[#17100b]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-28">
        <div>
          <p className="eyebrow reveal">Made for iPhone</p>
          <h2 className="display-xl reveal mt-4 text-4xl text-[#fff6ec] sm:text-5xl lg:text-6xl">
            Fast on iPhone. <em className="text-[#ffc36b]">Made for the moment.</em>
          </h2>
          <p className="reveal mt-5 max-w-xl text-base leading-relaxed text-[#c9b3a1]">
            Saving and rediscovering should feel immediate and native wherever
            you are. On iOS, SaveIt lives in the flows you already use, so a
            spark on the go becomes a find later at home.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {points.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="reveal rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#ff5a1f]/15 text-[#ffc36b]">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold text-[#fff6ec]">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#c9b3a1]">{p.body}</p>
                </div>
              );
            })}
          </div>
          <div className="reveal mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#cta" className="btn-primary">
              <SmartphoneIcon className="size-4" />
              Get SaveIt for iOS
            </a>
            <a href="#pricing" className="btn-ghost">
              <BellIcon className="size-4" />
              Compare plans
            </a>
          </div>
        </div>

        <div className="reveal mx-auto w-full max-w-[340px]">
          <div className="floaty relative rounded-[2.5rem] border border-white/15 bg-gradient-to-b from-[#2a1c12] to-[#100b08] p-3 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
            <div className="overflow-hidden rounded-[2rem] bg-[#0d0d10]">
              <div className="flex items-center justify-center pt-3" aria-hidden="true">
                <div className="h-6 w-28 rounded-full bg-black" />
              </div>
              <div className="relative">
                <img
                  src="/images/landing-v2/home.png"
                  alt="Lifestyle backdrop of a small lit house on a hill, showing where saved ideas live"
                  className="h-44 w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d10] via-transparent to-transparent" />
                <p className="absolute bottom-2 left-4 text-xs font-medium uppercase tracking-[0.2em] text-white/80">
                  Your home, in your pocket
                </p>
              </div>
              <div className="space-y-3 p-4 pb-6">
                <div className="rounded-2xl bg-white/[0.07] p-4" aria-label="Illustrative save sheet concept">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#ff5a1f] font-bold text-white">
                      S
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Save to SaveIt.now</p>
                      <p className="text-xs text-white/60">Share sheet concept</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-[13px]">
                    <div className="rounded-lg bg-white/10 px-3 py-2 text-white/90">Keep link with summary</div>
                    <div className="rounded-lg bg-white/5 px-3 py-2 text-white/60">Add a quick note, optional</div>
                    <div className="rounded-lg bg-emerald-400/20 px-3 py-2 font-medium text-emerald-200">
                      Saved. Your agent files it.
                    </div>
                  </div>
                </div>
                <p className="px-1 text-center text-[11px] leading-relaxed text-white/45">
                  Illustrative concept for the iOS save flow, not an app screenshot.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
