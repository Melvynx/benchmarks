import { Typography } from "@/components/nowts/typography";
import { CtaButton } from "@/features/landing/cta-button";
import { motion } from "motion/react";
import { Play, Zap } from "lucide-react";
import Image from "@/compat/image";

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

type ToolHeroProps = {
  h1: string;
  h1Highlight: string;
  subtitle: string;
};

export function ToolHero({ h1, h1Highlight, subtitle }: ToolHeroProps) {
  return (
    <section className="relative overflow-hidden">
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

      <div className="relative px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Typography
              variant="h1"
              className="text-foreground text-3xl font-black tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
            >
              {h1}{" "}
              <span className="text-primary decoration-primary/30 underline decoration-4 underline-offset-4 sm:decoration-8">
                {h1Highlight}
              </span>
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
              {subtitle}
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
          className="relative mt-10 overflow-hidden py-8 sm:mt-12 md:py-12"
        >
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-linear-to-r to-transparent md:w-32" />
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-linear-to-l to-transparent md:w-32" />

          <div className="flex flex-col gap-3 md:gap-4">
            <div className="animate-marquee flex gap-3 md:gap-4">
              {[...MARQUEE_IMAGES, ...MARQUEE_IMAGES].map((src, index) => (
                <div
                  key={`row1-${index}`}
                  className="relative aspect-video h-[80px] shrink-0 overflow-hidden rounded-lg border shadow-md sm:h-[100px] lg:h-[140px]"
                >
                  <Image
                    src={src}
                    alt={`AI Generated Thumbnail ${(index % MARQUEE_IMAGES.length) + 1}`}
                    fill
                    sizes="(max-width: 768px) 100px, 160px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="animate-marquee-reverse flex gap-3 md:gap-4">
              {[...MARQUEE_IMAGES, ...MARQUEE_IMAGES]
                .reverse()
                .map((src, index) => (
                  <div
                    key={`row2-${index}`}
                    className="relative aspect-video h-[80px] shrink-0 overflow-hidden rounded-lg border shadow-md sm:h-[100px] lg:h-[140px]"
                  >
                    <Image
                      src={src}
                      alt={`AI Generated Thumbnail ${(index % MARQUEE_IMAGES.length) + 1}`}
                      fill
                      sizes="(max-width: 768px) 100px, 160px"
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
}
