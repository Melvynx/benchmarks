import { Typography } from "@/components/nowts/typography";
import { cn } from "@/lib/utils";
import { SiteConfig } from "@/site-config";
import { motion, AnimatePresence } from "motion/react";
import {
  Banana,
  Check,
  Copy,
  Download,
  ImageIcon,
  LinkIcon,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";
import Image from "@/compat/image";
import { useState, useEffect } from "react";
import { SectionLayout } from "./section-layout";

const DEMO_DATA = {
  person: {
    name: "Melvyn",
    image: "/landing/person-melvyn.webp",
  },
  inspiration: {
    source: "MrBeast Style",
    image: "/landing/yt-mrbeast.jpg",
  },
  prompt:
    "A surprised face looking at a giant pile of money with dramatic lighting and bold yellow text saying 'I WON'",
  results: [
    "/landing/demo-1.jpeg",
    "/landing/demo-2.jpeg",
    "/landing/demo-3.jpeg",
    "/landing/demo-4.jpeg",
  ],
};

type DemoStep = "typing" | "generating" | "results";

export function DemoSection() {
  const [step, setStep] = useState<DemoStep>("typing");
  const [typedPrompt, setTypedPrompt] = useState("");
  const [selectedResult, setSelectedResult] = useState(3);
  const [generatedCount, setGeneratedCount] = useState(0);

  useEffect(() => {
    let isActive = true;
    const intervals: NodeJS.Timeout[] = [];
    const timeouts: NodeJS.Timeout[] = [];

    const runDemo = () => {
      if (!isActive) return;

      setStep("typing");
      setTypedPrompt("");
      setGeneratedCount(0);
      setSelectedResult(3);

      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (!isActive) {
          clearInterval(typeInterval);
          return;
        }
        if (charIndex < DEMO_DATA.prompt.length) {
          setTypedPrompt(DEMO_DATA.prompt.slice(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typeInterval);

          const t1 = setTimeout(() => {
            if (!isActive) return;
            setStep("generating");

            let generated = 0;
            const generateInterval = setInterval(() => {
              if (!isActive) {
                clearInterval(generateInterval);
                return;
              }
              generated++;
              setGeneratedCount(generated);
              if (generated >= 4) {
                clearInterval(generateInterval);
                const t2 = setTimeout(() => {
                  if (!isActive) return;
                  setStep("results");
                }, 300);
                timeouts.push(t2);
              }
            }, 600);
            intervals.push(generateInterval);
          }, 600);
          timeouts.push(t1);
        }
      }, 25);
      intervals.push(typeInterval);
    };

    runDemo();

    return () => {
      isActive = false;
      intervals.forEach(clearInterval);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <SectionLayout size="lg" className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-primary/10 text-primary mx-auto mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
          <Sparkles className="size-4" />
          Live Demo
        </div>
        <Typography variant="h2" className="text-foreground">
          See It In Action
        </Typography>
        <Typography
          variant="lead"
          className="text-muted-foreground mx-auto mt-4 max-w-2xl"
        >
          Watch how easy it is to create professional thumbnails
        </Typography>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mx-auto mt-12 max-w-5xl"
      >
        <div className="bg-card overflow-hidden rounded-2xl border shadow-2xl">
          <div className="bg-muted flex items-center gap-2 border-b px-4 py-3">
            <div className="flex gap-1.5">
              <div className="size-3 rounded-full bg-red-500" />
              <div className="size-3 rounded-full bg-yellow-500" />
              <div className="size-3 rounded-full bg-green-500" />
            </div>
            <div className="bg-background/50 flex-1 rounded-md px-3 py-1 text-center text-xs text-gray-500">
              {SiteConfig.domain}/editor
            </div>
          </div>

          <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
            <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
              <div className="relative border-b">
                <div className="min-h-[72px] px-4 py-4 pr-12 text-left text-base md:text-lg">
                  <span className="text-foreground">{typedPrompt}</span>
                  {step === "typing" && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="bg-primary ml-0.5 inline-block h-5 w-0.5"
                    />
                  )}
                  {!typedPrompt && (
                    <span className="text-muted-foreground">
                      What will you imagine?
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <div className="text-muted-foreground hover:bg-accent flex size-8 items-center justify-center rounded-md">
                    <Sparkles className="size-4" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <DemoReferenceSection
                  icon={<ImageIcon className="size-4" />}
                  title="Images"
                  description="Use elements of an image"
                  hasContent={false}
                >
                  <div className="border-input flex items-center gap-2 rounded-lg border border-dashed p-2">
                    <div className="bg-muted flex size-8 items-center justify-center rounded">
                      <Plus className="text-muted-foreground size-4" />
                    </div>
                    <span className="text-muted-foreground text-xs">
                      Add images
                    </span>
                  </div>
                </DemoReferenceSection>

                <DemoReferenceSection
                  icon={<LinkIcon className="size-4" />}
                  title="Style References"
                  description="Use the style of an image"
                  hasContent={true}
                >
                  <div className="flex gap-2">
                    <div className="relative aspect-video w-24 overflow-hidden rounded-md border-2 border-green-500">
                      <Image
                        src={DEMO_DATA.inspiration.image}
                        alt={DEMO_DATA.inspiration.source}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                      <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-green-500">
                        <Check className="size-2 text-white" />
                      </div>
                    </div>
                  </div>
                </DemoReferenceSection>

                <DemoReferenceSection
                  icon={<User className="size-4" />}
                  title="Persons"
                  description="Use a person's likeness"
                  hasContent={true}
                >
                  <div className="flex items-center gap-2 rounded-lg p-1">
                    <div className="relative size-8 overflow-hidden rounded border-2 border-green-500">
                      <Image
                        src={DEMO_DATA.person.image}
                        alt={DEMO_DATA.person.name}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                    <span className="text-foreground text-sm font-medium">
                      {DEMO_DATA.person.name}
                    </span>
                  </div>
                </DemoReferenceSection>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-1.5">
                <div className="bg-primary/20 flex size-5 items-center justify-center rounded-full">
                  <Sparkles className="text-primary size-3" />
                </div>
                <span className="text-foreground text-sm font-medium">47</span>
                <span className="text-muted-foreground text-sm">
                  thumbnails
                </span>
              </div>

              <div className="flex flex-1 items-center justify-end gap-2">
                <div className="border-input bg-background flex h-8 w-[160px] items-center gap-2 rounded-md border px-3 text-sm">
                  <Banana className="size-4 text-yellow-500" />
                  <span className="text-foreground">Gemini 3 Pro</span>
                </div>

                <div className="border-input flex h-8 overflow-hidden rounded-md border">
                  {[1, 2, 3, 4].map((count) => (
                    <div
                      key={count}
                      className={cn(
                        "flex h-full w-8 items-center justify-center text-xs transition-colors",
                        count === 4
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {count}
                    </div>
                  ))}
                </div>

                <motion.div
                  className={cn(
                    "bg-primary text-primary-foreground flex h-8 items-center gap-2 rounded-md px-4 text-sm font-medium",
                    step === "generating" && "opacity-70",
                  )}
                  animate={
                    step === "generating" ? { scale: [1, 0.98, 1] } : undefined
                  }
                  transition={
                    step === "generating"
                      ? { duration: 0.5, repeat: Infinity }
                      : undefined
                  }
                >
                  {step === "generating" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate"
                  )}
                </motion.div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {(step === "generating" || step === "results") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-4"
                >
                  <div className="text-muted-foreground text-left text-sm font-medium">
                    {new Date().toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>

                  <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                    <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
                      {DEMO_DATA.results.map((result, i) => {
                        const isGenerated =
                          step === "results" || i < generatedCount;
                        const isGenerating =
                          step === "generating" && i === generatedCount;

                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{
                              opacity: isGenerated || isGenerating ? 1 : 0.3,
                              scale: 1,
                            }}
                            className={cn(
                              "group relative aspect-video overflow-hidden rounded-lg border",
                              selectedResult === i &&
                                step === "results" &&
                                "ring-primary ring-2",
                            )}
                            onClick={() =>
                              step === "results" && setSelectedResult(i)
                            }
                          >
                            {isGenerated ? (
                              <>
                                <Image
                                  src={result}
                                  alt={`Generated thumbnail ${i + 1}`}
                                  fill
                                  sizes="(max-width: 768px) 50vw, 25vw"
                                  className="object-cover"
                                />
                                {step === "results" && (
                                  <div className="absolute inset-0 flex cursor-pointer items-end justify-between bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                                    <div className="flex flex-col gap-0.5 text-xs text-white">
                                      <span className="font-medium">
                                        Gemini 3 Pro
                                      </span>
                                      <span className="text-white/70">
                                        2.1s
                                      </span>
                                    </div>
                                    <div className="flex gap-1">
                                      <div className="flex size-7 items-center justify-center rounded bg-white/20 backdrop-blur-sm hover:bg-white/30">
                                        <Pencil className="size-3 text-white" />
                                      </div>
                                      <div className="flex size-7 items-center justify-center rounded bg-white/20 backdrop-blur-sm hover:bg-white/30">
                                        <Copy className="size-3 text-white" />
                                      </div>
                                      <div className="flex size-7 items-center justify-center rounded bg-white/20 backdrop-blur-sm hover:bg-white/30">
                                        <Download className="size-3 text-white" />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : isGenerating ? (
                              <div className="bg-muted absolute inset-0 flex animate-pulse items-center justify-center">
                                <Loader2 className="text-muted-foreground size-8 animate-spin" />
                              </div>
                            ) : (
                              <div className="bg-muted absolute inset-0" />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="flex w-full flex-col gap-2 lg:w-64">
                      <div className="hover:bg-accent cursor-pointer rounded p-1 text-left text-sm leading-relaxed transition-colors">
                        {DEMO_DATA.prompt}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <div className="relative size-8 overflow-hidden rounded border">
                          <Image
                            src={DEMO_DATA.person.image}
                            alt="Person"
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        </div>
                        <div className="relative size-8 overflow-hidden rounded border">
                          <Image
                            src={DEMO_DATA.inspiration.image}
                            alt="Inspiration"
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        </div>
                      </div>
                      <div className="text-muted-foreground hover:text-foreground mt-1 flex w-fit cursor-pointer items-center gap-1.5 text-sm transition-colors">
                        <RotateCcw className="size-3" />
                        Reuse
                      </div>
                    </div>
                  </div>

                  {step === "results" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-muted-foreground text-center text-sm"
                    >
                      4 variations generated in 2.8 seconds
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </SectionLayout>
  );
}

type DemoReferenceSectionProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  hasContent: boolean;
  children: React.ReactNode;
};

function DemoReferenceSection({
  icon,
  title,
  description,
  hasContent,
  children,
}: DemoReferenceSectionProps) {
  return (
    <div className="flex min-h-[100px] flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-muted-foreground",
            hasContent && "text-foreground",
          )}
        >
          {icon}
        </span>
        <div className="flex flex-col">
          <span
            className={cn(
              "text-muted-foreground text-sm leading-tight font-medium",
              hasContent && "text-foreground",
            )}
          >
            {title}
          </span>
          <span className="text-muted-foreground text-xs leading-tight">
            {description}
          </span>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
