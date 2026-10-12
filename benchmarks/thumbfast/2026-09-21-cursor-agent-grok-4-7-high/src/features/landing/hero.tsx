import { Typography } from "@/components/nowts/typography";
import { Play, Zap } from "lucide-react";
import { motion } from "motion/react";
import Image from "@/compat/image";
import { CtaButton } from "./cta-button";

const MARQUEE_IMAGES = [
  "/landing/gen-1.jpeg",
  "/landing/gen-2.jpeg",
  "/landing/gen-3.jpeg",
  "/landing/gen-4.jpeg",
  "/landing/gen-5.jpeg",
  "/landing/gen-10.jpg",
  "/landing/gen-11.jpeg",
  "/landing/gen-12.jpeg",
  "/landing/gen-13.jpeg",
  "/landing/gen-14.jpeg",
  "/landing/gen-15.jpeg",
  "/landing/gen-16.jpeg",
  "/landing/gen-17.jpeg",
  "/landing/gen-18.jpeg",
  "/landing/gen-19.jpeg",
  "/landing/gen-20.jpeg",
  "/landing/gen-21.jpeg",
  "/landing/gen-22.jpeg",
  "/landing/gen-23.jpeg",
  "/landing/marquee-1.jpeg",
  "/landing/marquee-2.jpeg",
  "/landing/marquee-3.jpeg",
  "/landing/marquee-4.jpeg",
  "/landing/marquee-5.jpeg",
  "/landing/marquee-6.jpeg",
  "/landing/demo-1.jpeg",
];

const VIDEO_URL =
  "https://www.tella.tv/video/ai-thumbnails-that-grow-channels-fmu1/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <GradientOrbs />

      <div className="relative px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SocialProofBadge />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 sm:mt-8"
          >
            <Typography
              variant="h1"
              className="text-foreground text-3xl font-black tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Grok 4.7
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-4 max-w-2xl sm:mt-6"
          >
            <Typography
              variant="lead"
              className="text-muted-foreground text-base sm:text-lg md:text-xl"
            >
              AI thumbnails that outperform human-made designs. Generate up to 4
              variations at once — your face stays consistent, every time.
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-6"
          >
            <CtaButton href="/auth/start" icon={Zap}>
              Start Creating Free
            </CtaButton>
            <CtaButton href="#how-it-works" icon={Play} variant="secondary">
              See How It Works
            </CtaButton>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-muted-foreground mt-4 text-sm"
          >
            No credit card required. 5 free thumbnails included.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="relative mt-10 sm:mt-12"
        >
          {/* Mobile: Video only */}
          <div className="relative px-4 md:hidden">
            <div className="pointer-events-none absolute top-1/2 left-0 h-64 w-32 -translate-y-1/2 rounded-full bg-red-500/20 blur-3xl" />
            <div className="pointer-events-none absolute top-1/2 right-0 h-64 w-32 -translate-y-1/2 rounded-full bg-red-500/20 blur-3xl" />
            <div className="relative w-full overflow-hidden rounded-xl border bg-black shadow-2xl">
              <iframe
                src={VIDEO_URL}
                title="Product demo video"
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                className="aspect-video w-full"
              />
            </div>
          </div>

          {/* Desktop: Video overlaid on marquee */}
          <div className="relative hidden md:block">
            <div className="overflow-hidden py-12 md:py-16">
              <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-20 w-32 bg-gradient-to-r to-transparent" />
              <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-20 w-32 bg-gradient-to-l to-transparent" />

              <div className="flex flex-col gap-4">
                <div className="animate-marquee flex gap-4">
                  {[...MARQUEE_IMAGES, ...MARQUEE_IMAGES].map((src, index) => (
                    <div
                      key={`row1-${index}`}
                      className="relative aspect-video h-[140px] shrink-0 overflow-hidden rounded-lg border shadow-md lg:h-[160px]"
                    >
                      <Image
                        src={src}
                        alt={`AI Generated Thumbnail ${(index % MARQUEE_IMAGES.length) + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 160px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>

                <div className="animate-marquee-reverse flex gap-4">
                  {[...MARQUEE_IMAGES, ...MARQUEE_IMAGES]
                    .reverse()
                    .map((src, index) => (
                      <div
                        key={`row2-${index}`}
                        className="relative aspect-video h-[140px] shrink-0 overflow-hidden rounded-lg border shadow-md lg:h-[160px]"
                      >
                        <Image
                          src={src}
                          alt={`AI Generated Thumbnail ${(index % MARQUEE_IMAGES.length) + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 160px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="absolute inset-0 z-10 flex items-center justify-center px-4">
              <div className="pointer-events-none absolute top-1/2 left-0 h-64 w-48 -translate-y-1/2 rounded-full bg-red-500/20 blur-3xl md:w-64" />
              <div className="pointer-events-none absolute top-1/2 right-0 h-64 w-48 -translate-y-1/2 rounded-full bg-red-500/20 blur-3xl md:w-64" />
              <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border bg-black shadow-2xl lg:max-w-4xl">
                <iframe
                  src={VIDEO_URL}
                  title="Thumbnail.io product demo"
                  allowFullScreen
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  className="aspect-video w-full"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mobile: Separate marquee section below */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="relative mt-8 overflow-hidden py-4 md:hidden"
        >
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r to-transparent" />
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l to-transparent" />

          <div className="flex flex-col gap-3">
            <div className="animate-marquee-fast flex gap-3">
              {[...MARQUEE_IMAGES, ...MARQUEE_IMAGES].map((src, index) => (
                <div
                  key={`mobile-row1-${index}`}
                  className="relative aspect-video h-[80px] shrink-0 overflow-hidden rounded-lg border shadow-md sm:h-[100px]"
                >
                  <Image
                    src={src}
                    alt={`AI Generated Thumbnail ${(index % MARQUEE_IMAGES.length) + 1}`}
                    fill
                    sizes="100px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="animate-marquee-reverse-fast flex gap-3">
              {[...MARQUEE_IMAGES, ...MARQUEE_IMAGES]
                .reverse()
                .map((src, index) => (
                  <div
                    key={`mobile-row2-${index}`}
                    className="relative aspect-video h-[80px] shrink-0 overflow-hidden rounded-lg border shadow-md sm:h-[100px]"
                  >
                    <Image
                      src={src}
                      alt={`AI Generated Thumbnail ${(index % MARQUEE_IMAGES.length) + 1}`}
                      fill
                      sizes="100px"
                      className="object-cover"
                    />
                  </div>
                ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const GradientOrbs = () => {
  return (
    <>
      <div
        className="pointer-events-none absolute -top-40 left-1/4 size-[500px] rounded-full opacity-30 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,0,0,0.3) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute right-1/4 -bottom-40 size-[400px] rounded-full opacity-20 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(255,0,0,0.3) 0%, transparent 70%)",
        }}
      />
    </>
  );
};

const SocialProofBadge = () => {
  return (
    <a
      href="https://www.producthunt.com/products/thumbfa-st?embed=true&utm_source=badge-top-post-badge&utm_medium=badge&utm_campaign=badge-thumbfa-st"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image
        src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=1067364&theme=light&period=daily"
        alt="Thumbfa.st - Top Post on Product Hunt"
        width={250}
        height={54}
        unoptimized
        priority
      />
    </a>
  );
};
