import { Typography } from "@/components/nowts/typography";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Download, Sparkles, Upload } from "lucide-react";
import { SectionLayout } from "./section-layout";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Set Up Your Creative Assets",
    description:
      "Upload your face photos to create a Person profile. Paste YouTube URLs to save thumbnail styles you love. Do this once - use them forever.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Describe Your Vision",
    description:
      "Write a simple prompt describing your thumbnail. Select your Person, choose an Inspiration for style guidance, and pick how many variations you want (1-4).",
  },
  {
    number: "03",
    icon: Download,
    title: "Generate and Download",
    description:
      "Click generate and watch the AI work its magic. Preview your thumbnails, download the winner, and upload to YouTube. Total time: under 60 seconds.",
  },
];

export function HowItWorksSection() {
  return (
    <SectionLayout size="lg" id="how-it-works" className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h2" className="text-foreground">
          3 Steps to Your Next Viral Thumbnail
        </Typography>
        <Typography
          variant="lead"
          className="text-muted-foreground mx-auto mt-4 max-w-2xl"
        >
          No design skills needed. No complicated software. Just describe what
          you want and let AI do the heavy lifting.
        </Typography>
      </motion.div>

      <div className="relative mt-16">
        <div className="bg-border absolute top-0 left-1/2 hidden h-full w-px -translate-x-1/2 md:block" />

        <div className="space-y-12 md:space-y-0">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className={cn(
                "relative md:grid md:grid-cols-2 md:gap-12",
                index % 2 === 1 && "md:direction-rtl",
              )}
            >
              <div
                className={cn(
                  "bg-card relative rounded-2xl border p-8 text-left",
                  index % 2 === 0 ? "md:mr-12" : "md:col-start-2 md:ml-12",
                )}
              >
                <div className="bg-primary text-primary-foreground absolute -top-4 left-8 rounded-full px-4 py-2 text-sm font-bold">
                  Step {step.number}
                </div>
                <div className="mt-4 flex items-start gap-4">
                  <div className="bg-primary/10 text-primary shrink-0 rounded-xl p-3">
                    <step.icon className="size-6" />
                  </div>
                  <div>
                    <Typography
                      variant="h3"
                      className="text-foreground mb-2 text-xl font-semibold"
                    >
                      {step.title}
                    </Typography>
                    <Typography
                      variant="p"
                      className="text-muted-foreground leading-relaxed"
                    >
                      {step.description}
                    </Typography>
                  </div>
                </div>
              </div>

              <div className="bg-primary absolute top-8 left-1/2 hidden size-4 -translate-x-1/2 rounded-full border-4 border-white md:block dark:border-gray-900" />
            </motion.div>
          ))}
        </div>
      </div>
    </SectionLayout>
  );
}
