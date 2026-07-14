import { Typography } from "@/components/nowts/typography";
import Image from "@/compat/image";
import { cn } from "@/lib/utils";
import { Check, ImageIcon, Repeat2, User } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const FACE_REFERENCE = {
  label: "Saved face profile",
  src: "https://thumbnail-ia.mlvcdn.com/persons/1771959962064-melvyn-face.png",
};

const FACE_PROOFS = [
  {
    title: "Announcement frame",
    object: "whiteboard object",
    inspiration:
      "https://thumbnail-ia.mlvcdn.com/inspirations/anonymized-1778666431464.jpeg",
    outputs: [
      "https://thumbnail-ia.mlvcdn.com/generations/jn75wgz9xezzm0ynsdh1jqx8bd878ndb/1781335096648-Oio-EJt37t.jpeg",
      "https://thumbnail-ia.mlvcdn.com/generations/jn75wgz9xezzm0ynsdh1jqx8bd878ndb/1781335094506-MsNa_2NUg0.jpeg",
    ],
  },
  {
    title: "App list frame",
    object: "desktop app object",
    inspiration:
      "https://thumbnail-ia.mlvcdn.com/inspirations/anonymized-1780151303646.jpeg",
    outputs: [
      "https://thumbnail-ia.mlvcdn.com/generations/jn75wgz9xezzm0ynsdh1jqx8bd878ndb/1780151566169-AGB2ySapGn.jpeg",
      "https://thumbnail-ia.mlvcdn.com/generations/jn75wgz9xezzm0ynsdh1jqx8bd878ndb/1780151543291-v_Vv6A2GR4.jpeg",
    ],
  },
  {
    title: "Value chart frame",
    object: "chart object",
    inspiration:
      "https://thumbnail-ia.mlvcdn.com/inspirations/1771319682542-INVEST_FROM__0__My_SECRET_Step_by_Step_Plan_.png",
    outputs: [
      "https://thumbnail-ia.mlvcdn.com/generations/jn75wgz9xezzm0ynsdh1jqx8bd878ndb/1780151019607-rP4M1s-Sxs.jpeg",
      "https://thumbnail-ia.mlvcdn.com/generations/jn75wgz9xezzm0ynsdh1jqx8bd878ndb/1780151004775-DzeFXt9QR8.jpeg",
    ],
  },
];

const proofSteps = [
  {
    icon: User,
    label: "Face",
    value: "One saved person",
  },
  {
    icon: ImageIcon,
    label: "Inspiration",
    value: "Style and object reference",
  },
  {
    icon: Repeat2,
    label: "Output",
    value: "Same head, new thumbnail",
  },
];

export function YourFaceEverytimeSection() {
  const prefersReducedMotion = useReducedMotion();
  const reveal = prefersReducedMotion
    ? undefined
    : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
      };

  return (
    <section className="bg-foreground text-background overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <motion.div
          {...reveal}
          transition={{ duration: 0.5 }}
          className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end"
        >
          <div>
            <div className="border-background/15 bg-background/5 text-background/80 mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium">
              <Check className="text-primary size-4" />
              Live Convex generations
            </div>
            <Typography
              variant="h2"
              className="max-w-2xl text-4xl leading-[1.05] font-bold tracking-tight text-balance text-white sm:text-5xl"
            >
              Your face everytime
            </Typography>
            <Typography
              variant="lead"
              className="text-background/70 mt-5 max-w-2xl text-base leading-8 sm:text-lg"
            >
              Save one face once. Pair it with any inspiration, object, pose or
              headline. The production results below keep the person
              recognizable while the thumbnail changes around them.
            </Typography>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:gap-3">
            {proofSteps.map((step, index) => (
              <motion.div
                key={step.label}
                {...reveal}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="border-background/10 bg-background/5 rounded-xl border p-4"
              >
                <step.icon className="text-primary size-5" />
                <p className="mt-3 text-sm font-semibold text-white">
                  {step.label}
                </p>
                <p className="text-background/60 mt-1 text-sm leading-6">
                  {step.value}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
          <motion.div
            {...reveal}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="border-background/10 bg-background/5 rounded-xl border p-4"
          >
            <p className="text-background/60 mb-3 text-sm font-medium">
              {FACE_REFERENCE.label}
            </p>
            <div className="bg-background relative min-h-[420px] overflow-hidden rounded-lg">
              <Image
                src={FACE_REFERENCE.src}
                alt="Saved face reference used for production thumbnails"
                fill
                sizes="(max-width: 1024px) 100vw, 360px"
                className="object-cover object-top"
              />
            </div>
            <div className="border-background/10 mt-4 grid grid-cols-2 gap-3 border-t pt-4">
              <ProofFact label="Source" value="Person profile" />
              <ProofFact label="Reuse" value="Every prompt" />
            </div>
          </motion.div>

          <div className="grid gap-4">
            {FACE_PROOFS.map((proof, index) => (
              <FaceProofRow
                key={proof.title}
                proof={proof}
                index={index}
                motionProps={reveal}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FaceProofRow({
  proof,
  index,
  motionProps,
}: {
  proof: (typeof FACE_PROOFS)[number];
  index: number;
  motionProps:
    | {
        initial: { opacity: number; y: number };
        whileInView: { opacity: number; y: number };
        viewport: { once: boolean; margin: string };
      }
    | undefined;
}) {
  return (
    <motion.article
      {...motionProps}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.08 }}
      className="border-background/10 bg-background/5 rounded-xl border p-3"
    >
      <div className="grid gap-3 md:grid-cols-[0.56fr_1fr]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <Image
              src={proof.inspiration}
              alt={`${proof.title} inspiration reference`}
              fill
              sizes="(max-width: 768px) 100vw, 280px"
              className="object-cover"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="bg-background/10 text-background/70 rounded-full px-3 py-1 text-xs font-medium">
              Inspiration
            </span>
            <span className="bg-background/10 text-background/70 rounded-full px-3 py-1 text-xs font-medium">
              {proof.object}
            </span>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-white">
                {proof.title}
              </h3>
              <p className="text-background/55 mt-1 text-sm">
                Same face, different generated frame.
              </p>
            </div>
            <div className="border-background/10 hidden rounded-full border px-3 py-1 text-xs font-medium text-white sm:block">
              Production
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {proof.outputs.map((src, outputIndex) => (
              <div
                key={src}
                className={cn(
                  "relative aspect-video overflow-hidden rounded-lg",
                  outputIndex === 0 && "ring-primary/80 ring-2",
                )}
              >
                <Image
                  src={src}
                  alt={`${proof.title} generated thumbnail ${outputIndex + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 320px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function ProofFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-background/45 text-xs font-medium">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
