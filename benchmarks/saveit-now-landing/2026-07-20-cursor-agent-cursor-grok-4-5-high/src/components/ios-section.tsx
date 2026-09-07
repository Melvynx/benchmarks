import { Reveal } from "./reveal";
import { LandingAppButton } from "./landing-app-button";

export function IosSection() {
  return (
    <section id="ios" className="bg-surface px-6 py-[clamp(4.5rem,10vw,8rem)]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <p className="text-[13px] font-medium tracking-[0.16em] text-ember uppercase">
            On iOS
          </p>
          <h2 className="font-display mt-4 text-balance text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-ink">
            Save and rediscover wherever you are
          </h2>
          <p className="mt-5 text-pretty text-base leading-relaxed text-muted sm:text-lg">
            Share a link from Safari, Messages, or any app. Open SaveIt later
            and ask for it in plain language. The mobile side is built to feel
            immediate and native, so the habit stays with you off the desktop.
          </p>
          <ul className="mt-8 space-y-4 text-[15px] text-ink">
            {[
              "Share sheet capture in one tap",
              "Ask for a save the way you would ask a friend",
              "Synced home across phone and browser",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-ember"
                  aria-hidden="true"
                />
                <span className="text-pretty leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-9">
            <LandingAppButton
              variant="ember"
              signedOutChildren="Get SaveIt on iOS"
            />
          </div>
        </Reveal>

        <Reveal className="lg:col-span-7" delayMs={80}>
          <div className="relative">
            <div className="overflow-hidden rounded-[1.75rem] bg-ink/5 p-2 shadow-[0_40px_100px_-50px_rgba(42,33,28,0.55)]">
              <img
                src="/images/landing-v2/observatory.png"
                alt="A solitary figure facing a hilltop observatory under a glowing ring of light, presence wherever you stand"
                className="img-edge aspect-[16/10] w-full rounded-[calc(1.75rem-0.5rem)] object-cover"
                width={3272}
                height={1834}
                loading="lazy"
              />
            </div>

            {/* Stylized device chrome, not a fake app screenshot */}
            <div
              className="absolute -bottom-6 right-4 w-[min(42%,14rem)] sm:right-8 sm:w-56"
              aria-hidden="true"
            >
              <div className="rounded-[1.6rem] bg-ink p-[0.35rem] shadow-[0_24px_60px_-20px_rgba(42,33,28,0.7)]">
                <div className="overflow-hidden rounded-[1.35rem] bg-gradient-to-b from-[#3a2418] to-[#1a120e]">
                  <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-white/20" />
                  <div className="space-y-3 px-4 pt-6 pb-5">
                    <div className="h-2 w-20 rounded-full bg-ember/80" />
                    <div className="space-y-2">
                      <div className="h-2 w-full rounded-full bg-white/15" />
                      <div className="h-2 w-[85%] rounded-full bg-white/10" />
                      <div className="h-2 w-[70%] rounded-full bg-white/10" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="aspect-square rounded-xl bg-white/8" />
                      <div className="aspect-square rounded-xl bg-white/8" />
                    </div>
                    <div className="pt-2 text-center text-[10px] tracking-wide text-white/45">
                      SaveIt · iOS
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
