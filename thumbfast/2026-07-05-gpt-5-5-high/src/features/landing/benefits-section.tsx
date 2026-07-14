import { Typography } from "@/components/nowts/typography";
import { SiteConfig } from "@/site-config";
import { motion } from "motion/react";
import { Clock, Grid3X3, Lightbulb, User } from "lucide-react";
import { SectionLayout } from "./section-layout";

const benefits = [
  {
    icon: User,
    title: "Your Face, Every Time",
    description:
      "Upload your photo once, use it forever. Our AI maintains your exact likeness across every thumbnail — building the brand recognition that drives repeat clicks.",
  },
  {
    icon: Lightbulb,
    title: "Copy What Works",
    description:
      "See a high-performing thumbnail? Paste the YouTube URL. We extract the style, colors, and composition from proven winners so you can replicate their success.",
  },
  {
    icon: Grid3X3,
    title: "A/B Test Like the Pros",
    description:
      "Generate 1-4 thumbnail variations with one click. Data-driven creators A/B test their options — now you can too.",
  },
  {
    icon: Clock,
    title: "More Videos, More Views",
    description:
      "Stop losing momentum to thumbnail design. Spend that time creating content that grows your channel.",
  },
];

export function BenefitsSection() {
  return (
    <SectionLayout size="lg" className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Typography className="text-primary font-extrabold uppercase">
          The Solution
        </Typography>
        <Typography variant="h2" className="text-foreground mt-2">
          Meet Your AI Thumbnail Designer
        </Typography>
        <Typography
          variant="lead"
          className="text-muted-foreground mx-auto mt-4 max-w-2xl"
        >
          {SiteConfig.title} isn't just another AI image generator. It's built
          specifically for YouTube creators who want professional thumbnails
          without the professional learning curve.
        </Typography>
      </motion.div>

      <div className="mt-16 grid gap-6 md:grid-cols-2">
        {benefits.map((benefit, index) => (
          <motion.div
            key={benefit.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="bg-card flex h-full flex-col rounded-2xl border p-8 text-left">
              <div className="bg-primary/10 text-primary mb-6 inline-flex w-fit rounded-xl p-3">
                <benefit.icon className="size-6" />
              </div>
              <Typography
                variant="h3"
                className="text-foreground mb-3 text-xl font-semibold"
              >
                {benefit.title}
              </Typography>
              <Typography
                variant="p"
                className="text-muted-foreground leading-relaxed"
              >
                {benefit.description}
              </Typography>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionLayout>
  );
}
