import { Typography } from "@/components/nowts/typography";
import { motion } from "motion/react";
import { ArrowRight, Layers } from "lucide-react";
import Image from "@/compat/image";
import { RotatingThumbnails } from "./rotating-thumbnails";

const FACE_IMAGE = "/landing/person-face.webp";

export function FaceToThumbnailsFeature() {
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
            <Layers className="size-7" />
          </div>
          <Typography
            variant="h3"
            className="text-foreground mb-2 text-2xl font-bold"
          >
            Upload Once, Generate Forever
          </Typography>
          <Typography
            variant="p"
            className="text-muted-foreground text-lg leading-relaxed"
          >
            Create a &apos;Person&apos; profile with your photos and
            description. Every future thumbnail automatically includes your
            consistent likeness. No more re-uploading, no more AI guessing
            games.
          </Typography>
        </div>
        <div className="flex items-center justify-center gap-3 py-4 md:gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-xl md:size-28">
            <Image
              src={FACE_IMAGE}
              alt="Your face"
              fill
              sizes="(max-width: 768px) 80px, 112px"
              className="object-cover"
            />
          </div>
          <ArrowRight className="text-primary size-6 shrink-0 md:size-8" />
          <RotatingThumbnails />
        </div>
      </div>
    </motion.div>
  );
}
