import { Typography } from "@/components/nowts/typography";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Download, History } from "lucide-react";
import { SectionLayout } from "./section-layout";
import {
  FaceToThumbnailsFeature,
  InspirationFeature,
  MultiThumbnailFeature,
} from "./features";

const regularFeatures = [
  {
    icon: History,
    headline: "Never Lose a Good Idea",
    description:
      "Every thumbnail you generate is saved automatically. Scroll through your version history, compare iterations, and revisit old ideas anytime.",
  },
  {
    icon: Download,
    headline: "Ready to Upload, Zero Adjustments",
    description:
      "Every thumbnail is generated at YouTube's exact 1280x720 resolution. Download as high-quality PNG and upload directly to YouTube Studio.",
  },
];

export function FeaturesSection() {
  return (
    <SectionLayout
      size="lg"
      id="features"
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
          Everything You Need. Nothing You Don&apos;t.
        </Typography>
        <Typography
          variant="lead"
          className="text-muted-foreground mx-auto mt-4 max-w-2xl"
        >
          Powerful features designed specifically for YouTube creators who want
          professional thumbnails fast.
        </Typography>
      </motion.div>

      <div className="mt-16 space-y-6">
        <FaceToThumbnailsFeature />
        <InspirationFeature />
        <MultiThumbnailFeature />

        <div className="grid gap-6 md:grid-cols-2">
          {regularFeatures.map((feature, index) => (
            <motion.div
              key={feature.headline}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className={cn(
                "bg-card group relative overflow-hidden rounded-2xl border p-6 text-left transition-all hover:shadow-lg md:p-8",
              )}
            >
              <div className="from-primary/5 to-primary/0 absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="bg-primary/10 text-primary mb-4 inline-flex rounded-lg p-3">
                  <feature.icon className="size-6" />
                </div>
                <Typography
                  variant="h3"
                  className="text-foreground mb-2 text-lg font-semibold"
                >
                  {feature.headline}
                </Typography>
                <Typography variant="muted" className="text-sm leading-relaxed">
                  {feature.description}
                </Typography>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionLayout>
  );
}
