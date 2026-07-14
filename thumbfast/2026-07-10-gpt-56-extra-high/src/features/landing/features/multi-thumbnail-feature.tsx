import { Typography } from "@/components/nowts/typography";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Image as ImageIcon } from "lucide-react";
import Image from "@/compat/image";
import { useEffect, useState } from "react";

const THUMBNAIL_IMAGES = [
  "/landing/gen-6.jpeg",
  "/landing/gen-7.jpeg",
  "/landing/gen-8.jpeg",
  "/landing/gen-9.jpeg",
];

export function MultiThumbnailFeature() {
  const [count, setCount] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const visibleImages = THUMBNAIL_IMAGES.slice(0, count);

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
            <ImageIcon className="size-7" />
          </div>
          <Typography
            variant="h3"
            className="text-foreground mb-2 text-2xl font-bold"
          >
            4 Options. 1 Click. 0 Guesswork.
          </Typography>
          <Typography
            variant="p"
            className="text-muted-foreground text-lg leading-relaxed"
          >
            Generate up to 4 thumbnail variations simultaneously. See them side
            by side, pick your favorite, or test them all. Each variation uses
            just 1 thumbnail from your plan.
          </Typography>
        </div>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-56 w-full max-w-md items-center justify-center md:h-64">
            <motion.div
              layout
              className={cn(
                "grid w-full gap-2",
                count === 1 && "grid-cols-1",
                count === 2 && "grid-cols-2",
                count === 3 && "grid-cols-3",
                count === 4 && "grid-cols-2",
              )}
            >
              <AnimatePresence mode="popLayout">
                {visibleImages.map((src, index) => (
                  <motion.div
                    key={src}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="relative aspect-video overflow-hidden rounded-xl border-2 border-green-500 shadow-lg"
                  >
                    <Image
                      src={src}
                      alt={`Thumbnail variation ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 200px"
                      className="object-cover"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((num) => (
              <Button
                key={num}
                variant={count === num ? "default" : "outline"}
                size="sm"
                onClick={() => setCount(num)}
                className="size-10 p-0 font-bold"
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
