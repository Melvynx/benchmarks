import { Typography } from "@/components/nowts/typography";
import { upfetch } from "@/lib/up-fetch";
import { ImageIcon, Lightbulb, Users } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

type StatItemProps = {
  icon: React.ReactNode;
  value: string;
  label: string;
  delay: number;
};

const StatItem = ({ icon, value, label, delay }: StatItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center gap-2"
    >
      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
        {icon}
      </div>
      <Typography variant="h2" className="text-3xl font-bold md:text-4xl">
        {value}
      </Typography>
      <Typography variant="muted" className="text-center text-sm md:text-base">
        {label}
      </Typography>
    </motion.div>
  );
};

export const StatsDivider = ({
  disableLiveStats = false,
}: {
  disableLiveStats?: boolean;
}) => {
  const [thumbnailsCount, setThumbnailsCount] = useState<number | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [inspirationsCount, setInspirationsCount] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (disableLiveStats) {
      return;
    }

    upfetch("/api/stats/thumbnails-count")
      .then((data: { count: number }) => setThumbnailsCount(data.count))
      .catch(() => null);

    upfetch("/api/stats/users-count")
      .then((data: { count: number }) => setUsersCount(data.count))
      .catch(() => null);

    upfetch("/api/stats/inspirations-count")
      .then((data: { count: number }) => setInspirationsCount(data.count))
      .catch(() => null);
  }, [disableLiveStats]);

  const formatNumber = (num: number | null, fallback: number) => {
    const value = num ?? fallback;
    return `${new Intl.NumberFormat("en-US").format(value)}+`;
  };

  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="bg-muted/50 absolute inset-0" />
      <div className="relative mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-3 gap-8 md:gap-16">
          <StatItem
            icon={<ImageIcon className="size-6" />}
            value={formatNumber(thumbnailsCount, 1000)}
            label="Thumbnails Generated"
            delay={0}
          />
          <StatItem
            icon={<Users className="size-6" />}
            value={formatNumber(usersCount, 100)}
            label="Creators Joined"
            delay={0.1}
          />
          <StatItem
            icon={<Lightbulb className="size-6" />}
            value={formatNumber(inspirationsCount, 500)}
            label="Inspirations Saved"
            delay={0.2}
          />
        </div>
      </div>
    </section>
  );
};
