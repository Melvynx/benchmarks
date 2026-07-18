import { Typography } from "@/components/nowts/typography";
import { SectionLayout } from "@/features/landing/section-layout";
import {
  Clock,
  CreditCard,
  DollarSign,
  Grid3X3,
  Palette,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  CreditCard,
  Clock,
  Zap,
  DollarSign,
  Grid3X3,
  Palette,
  Shield,
};

type SellingPoint = {
  icon: string;
  title: string;
  description: string;
};

export function PersonaSellingPoints({ points }: { points: SellingPoint[] }) {
  return (
    <SectionLayout size="lg" className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h2" className="text-foreground">
          Why It Works for You
        </Typography>
      </motion.div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {points.map((point, index) => {
          const Icon = ICON_MAP[point.icon] ?? Sparkles;
          return (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="bg-card flex h-full flex-col items-center rounded-2xl border p-8 text-center">
                <div className="bg-primary/10 text-primary mb-6 inline-flex rounded-xl p-3">
                  <Icon className="size-6" />
                </div>
                <Typography
                  variant="h3"
                  className="text-foreground mb-3 text-xl font-semibold"
                >
                  {point.title}
                </Typography>
                <Typography
                  variant="p"
                  className="text-muted-foreground leading-relaxed"
                >
                  {point.description}
                </Typography>
              </div>
            </motion.div>
          );
        })}
      </div>
    </SectionLayout>
  );
}
