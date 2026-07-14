import { Typography } from "@/components/nowts/typography";
import { motion } from "motion/react";
import { ArrowRight, Mic } from "lucide-react";
import Image from "@/compat/image";

const PODCAST_SOURCE = "/landing/podcast-start.jpg";

const PODCAST_RESULTS = [
  "/landing/podcast-theo.jpeg",
  "/landing/podcast-theyo.jpeg",
  "/landing/podcast-marc.jpeg",
];

export function PodcastSection() {
  return (
    <section className="overflow-hidden bg-zinc-950 py-20 text-white lg:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400">
            <Mic className="size-4" />
            Podcast Mode
          </div>
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Same setup. <span className="text-red-500">Endless guests.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Upload one podcast thumbnail template. Our AI swaps guests
            seamlessly — keeping your style, lighting, and brand consistent
            across every episode.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 flex flex-col items-center justify-center gap-8 lg:flex-row lg:gap-12"
        >
          <div className="shrink-0">
            <div className="relative aspect-video w-[320px] overflow-hidden rounded-2xl border-4 border-zinc-700 sm:w-[400px]">
              <Image
                src={PODCAST_SOURCE}
                alt="Podcast source thumbnail template"
                fill
                sizes="(max-width: 640px) 320px, 400px"
                className="object-cover"
              />
            </div>
            <Typography
              variant="muted"
              className="mt-3 text-center text-zinc-500"
            >
              Your template
            </Typography>
          </div>

          <div className="flex flex-col items-center gap-4 lg:gap-6">
            {PODCAST_RESULTS.map((result, index) => (
              <div key={result} className="flex items-center gap-4 lg:gap-6">
                <ArrowRight className="size-8 shrink-0 text-red-500" />
                <div className="relative aspect-video w-[200px] overflow-hidden rounded-xl ring-2 ring-red-500 sm:w-[260px]">
                  <Image
                    src={result}
                    alt={`Podcast thumbnail variation ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 200px, 260px"
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 flex items-center justify-center"
        >
          <Typography variant="p" className="text-zinc-400">
            One template. Infinite guests.{" "}
            <span className="font-semibold text-white">Zero redesign.</span>
          </Typography>
        </motion.div>
      </div>
    </section>
  );
}
