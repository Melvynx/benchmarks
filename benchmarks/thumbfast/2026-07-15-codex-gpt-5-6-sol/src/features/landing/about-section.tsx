import { Typography } from "@/components/nowts/typography";
import { motion } from "motion/react";
import Image from "@/compat/image";
import { SectionLayout } from "./section-layout";

export function AboutSection() {
  return (
    <SectionLayout size="lg" id="about">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="order-2 lg:order-1"
        >
          <Typography className="text-primary font-extrabold uppercase">
            The Story Behind This
          </Typography>
          <Typography variant="h2" className="text-foreground mt-2">
            The Thumbnail That Changed Everything
          </Typography>
          <div className="text-muted-foreground mt-6 flex flex-col gap-4 text-lg leading-relaxed">
            <Typography variant="p">
              I&apos;m Melvyn, and I used to spend hours perfecting thumbnails.
              Then I ran an experiment.
            </Typography>
            <Typography variant="p">
              I A/B tested an AI-generated thumbnail against my best human-made
              designs. The result?{" "}
              <span className="text-primary font-semibold">
                The AI version got 2x more watch time
              </span>
              . 51.5% watch time share vs 24.8% and 23.7% for the others.
            </Typography>
            <Typography variant="p">
              That single test made me fire my thumbnail designer and go all-in
              on AI. The performance difference was too significant to ignore.
            </Typography>
            <Typography variant="p">
              I built this tool so every creator can get the same unfair
              advantage — thumbnails that actually outperform.
            </Typography>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="order-1 lg:order-2"
        >
          <div className="relative overflow-hidden rounded-2xl border shadow-2xl">
            <Image
              src="/images/about-me.webp"
              alt="A/B Test showing AI thumbnail performing 2x better than human-made thumbnails"
              width={1280}
              height={720}
              className="w-full"
            />
          </div>
          <Typography
            variant="muted"
            className="mt-4 text-center text-sm italic"
          >
            Real A/B test results: AI thumbnail won with 51.5% watch time share
          </Typography>
        </motion.div>
      </div>
    </SectionLayout>
  );
}
