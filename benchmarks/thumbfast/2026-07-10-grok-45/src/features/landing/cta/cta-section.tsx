import { Typography } from "@/components/nowts/typography";
import { motion } from "motion/react";
import { ArrowRight, Zap } from "lucide-react";
import { SectionLayout } from "../section-layout";
import { CtaButton } from "../cta-button";

export function CtaSection() {
  return (
    <SectionLayout size="lg" className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="bg-card relative overflow-hidden rounded-3xl border p-8 md:p-16">
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(255,0,0,0.1) 0%, transparent 50%)",
            }}
          />

          <div className="relative">
            <Typography
              variant="h2"
              className="text-foreground text-3xl font-bold md:text-5xl"
            >
              Get Thumbnails That{" "}
              <span className="text-primary">Actually Convert</span>
            </Typography>

            <Typography
              variant="lead"
              className="text-muted-foreground mx-auto mt-6 max-w-2xl"
            >
              Stop guessing what works. Our AI thumbnails consistently
              outperform human-made designs. Join 2,000+ creators who've seen
              the results.
            </Typography>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <CtaButton href="/auth/start" icon={Zap}>
                Create Your First Thumbnail Free
              </CtaButton>
              <CtaButton href="/contact" icon={ArrowRight} variant="secondary">
                Questions? Contact Us
              </CtaButton>
            </div>

            <Typography
              variant="muted"
              className="text-muted-foreground mt-6 text-sm"
            >
              No credit card required. Cancel anytime.
            </Typography>
          </div>
        </div>
      </motion.div>
    </SectionLayout>
  );
}
