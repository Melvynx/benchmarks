import { Typography } from "@/components/nowts/typography";
import { motion } from "motion/react";
import { ArrowRight, Link2 } from "lucide-react";
import Image from "@/compat/image";

const INSPIRATION_IMAGE = "/landing/inspiration-1.jpeg";

const RESULT_IMAGE = "/landing/gen-1.jpeg";

export function InspirationFeature() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-card group relative overflow-hidden rounded-2xl border p-8 text-left md:p-12"
    >
      <div className="from-primary/5 to-primary/0 absolute inset-0 bg-gradient-to-br" />
      <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
        <div>
          <div className="bg-muted/80 text-primary mb-6 inline-flex rounded-2xl border p-3.5 shadow-sm">
            <Link2 className="size-7" />
          </div>
          <Typography
            variant="h3"
            className="text-foreground mb-2 text-2xl font-bold"
          >
            Copy Any Thumbnail&apos;s Vibe in 10 Seconds
          </Typography>
          <Typography
            variant="p"
            className="text-muted-foreground text-lg leading-relaxed"
          >
            Paste any YouTube URL. We grab the thumbnail and our AI analyzes the
            style, colors, text placement, and mood. Save it to your Inspiration
            library and reference it whenever you create.
          </Typography>
        </div>
        <div className="flex items-center justify-center gap-3 py-4 md:gap-4">
          <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl border shadow-lg md:w-44">
            <Image
              src={INSPIRATION_IMAGE}
              alt="Inspiration thumbnail"
              fill
              sizes="(max-width: 768px) 112px, 176px"
              className="object-cover"
            />
            <div className="bg-muted/90 text-foreground absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-medium md:bottom-2 md:left-2 md:px-2 md:py-1 md:text-xs">
              Inspiration
            </div>
          </div>
          <ArrowRight className="text-primary size-6 shrink-0 md:size-8" />
          <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xl border-2 border-green-500 shadow-lg md:w-44">
            <Image
              src={RESULT_IMAGE}
              alt="Generated result"
              fill
              sizes="(max-width: 768px) 112px, 176px"
              className="object-cover"
            />
            <div className="absolute bottom-1 left-1 rounded bg-green-500 px-1.5 py-0.5 text-[10px] font-medium text-white md:bottom-2 md:left-2 md:px-2 md:py-1 md:text-xs">
              Result
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
