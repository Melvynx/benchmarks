import { Typography } from "@/components/nowts/typography";
import { motion } from "motion/react";
import { ShieldOff, Grid3X3 } from "lucide-react";
import { SectionLayout } from "./section-layout";

const FEATURES = [
  {
    icon: Grid3X3,
    title: "Built-in Pixelate Tool",
    description:
      "Pixelate any face or sensitive area directly in the editor with a single click.",
  },
  {
    icon: ShieldOff,
    title: "Bypass Policy Blocks",
    description:
      "When AI refuses to generate due to policy restrictions, pixelate and regenerate.",
  },
];

export function BypassAISection() {
  return (
    <SectionLayout size="lg" id="bypass-ai">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Typography className="text-primary font-extrabold uppercase">
            Never Get Blocked
          </Typography>
          <Typography variant="h2" className="text-foreground mt-2">
            Bypass AI Restrictions
          </Typography>
          <Typography
            variant="lead"
            className="text-muted-foreground mt-4 max-w-xl"
          >
            Copy any thumbnail with our built-in pixelate tools. When AI policy
            blocks your generation, simply pixelate the face and fix the
            problem.
          </Typography>

          <div className="mt-8 flex flex-col gap-4">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.1 * i }}
                className="flex gap-4"
              >
                <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <feature.icon className="text-primary size-5" />
                </div>
                <div>
                  <Typography variant="large" className="text-foreground">
                    {feature.title}
                  </Typography>
                  <Typography variant="muted" className="mt-1">
                    {feature.description}
                  </Typography>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="relative aspect-video overflow-hidden rounded-2xl border shadow-2xl">
            <iframe
              src="https://www.tella.tv/video/melvynxs-video-fcm7/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0"
              title="Bypass AI demo video"
              allowFullScreen
              className="absolute inset-0 size-full"
              allow="autoplay; fullscreen; picture-in-picture"
            />
          </div>
          <Typography
            variant="muted"
            className="mt-4 text-center text-sm italic"
          >
            Watch how to bypass AI restrictions using the pixelate tool
          </Typography>
        </motion.div>
      </div>
    </SectionLayout>
  );
}
