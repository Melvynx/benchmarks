import { Typography } from "@/components/nowts/typography";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Clock, Frown, Search } from "lucide-react";
import { SectionLayout } from "./section-layout";

const painPoints = [
  {
    icon: Clock,
    title: "Another hour lost to Canva",
    description:
      "You spend more time designing thumbnails than editing your actual video. Every. Single. Week.",
  },
  {
    icon: Frown,
    title: "Why doesn't my face look the same?",
    description:
      "You've uploaded your photo 47 times this month, and somehow it looks different in every thumbnail.",
  },
  {
    icon: Search,
    title: "Which thumbnail style should I copy?",
    description:
      "You're 20 tabs deep into competitor research, and you still haven't started designing.",
  },
];

export function ProblemSection() {
  return (
    <SectionLayout
      size="lg"
      containerClassName="bg-muted/30"
      className="text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h2" className="text-foreground">
          Sound Familiar?
        </Typography>
      </motion.div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {painPoints.map((point, index) => (
          <motion.div
            key={point.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={cn(
              "bg-card group relative overflow-hidden rounded-xl border p-6 text-left transition-all hover:shadow-lg",
            )}
          >
            <div className="from-primary/5 to-primary/0 absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative">
              <div className="bg-primary/10 text-primary mb-4 inline-flex rounded-lg p-3">
                <point.icon className="size-6" />
              </div>
              <Typography
                variant="h3"
                className="text-foreground mb-2 text-lg font-semibold"
              >
                {point.title}
              </Typography>
              <Typography variant="muted" className="text-sm leading-relaxed">
                {point.description}
              </Typography>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-card mx-auto mt-12 max-w-3xl rounded-xl border p-8"
      >
        <Typography
          variant="p"
          className="text-muted-foreground text-base leading-relaxed"
        >
          Here's the harsh truth:{" "}
          <span className="text-foreground font-medium">
            Your thumbnail is the difference between 100 views and 100,000
            views.
          </span>{" "}
          While you're spending hours on thumbnails that might work, top
          creators are using AI to generate thumbnails that consistently
          outperform.{" "}
          <span className="text-primary font-medium">
            They're getting more clicks while spending less time on design.
          </span>
        </Typography>
      </motion.div>
    </SectionLayout>
  );
}
