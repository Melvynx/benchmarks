import { Typography } from "@/components/nowts/typography";
import { CtaButton } from "@/features/landing/cta-button";
import { Play, Zap } from "lucide-react";
import { motion } from "motion/react";

type PersonaHeroProps = {
  badge: string;
  h1: string;
  h1Highlight: string;
  subtitle: string;
};

export function PersonaHero({
  badge,
  h1,
  h1Highlight,
  subtitle,
}: PersonaHeroProps) {
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

      <div className="relative px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="bg-primary/10 text-primary inline-flex rounded-full px-4 py-1.5 text-sm font-semibold">
              {badge}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6"
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
      </div>
    </section>
  );
}
