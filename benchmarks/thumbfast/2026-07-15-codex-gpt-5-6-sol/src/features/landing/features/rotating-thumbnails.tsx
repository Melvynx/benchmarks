import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import Image from "@/compat/image";
import { useEffect, useState } from "react";

const GENERATED_THUMBNAILS = [
  "/landing/gen-1.jpeg",
  "/landing/gen-2.jpeg",
  "/landing/gen-5.jpeg",
];

export function RotatingThumbnails() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % GENERATED_THUMBNAILS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative aspect-video w-28 overflow-hidden rounded-xl border shadow-lg md:w-44">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0"
        >
          <Image
            src={GENERATED_THUMBNAILS[currentIndex]}
            alt="Generated thumbnail"
            fill
            sizes="(max-width: 768px) 112px, 176px"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {GENERATED_THUMBNAILS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "size-1.5 rounded-full transition-all",
              i === currentIndex ? "w-4 bg-white" : "bg-white/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}
