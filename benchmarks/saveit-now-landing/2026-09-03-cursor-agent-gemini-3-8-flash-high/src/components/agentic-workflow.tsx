"use client";

import { useState } from "react";
import {
  CameraIcon,
  BrainCircuitIcon,
  GitForkIcon,
  SearchIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  LayersIcon,
  GlobeIcon,
  FileTextIcon,
  VideoIcon,
} from "lucide-react";

interface PipelineStage {
  id: string;
  step: string;
  name: string;
  headline: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  details: {
    label: string;
    value: string;
  }[];
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "capture",
    step: "01",
    name: "Autonomous Capture",
    headline: "You press save. The agent takes over.",
    description:
      "Send any web page, PDF, YouTube video, or X thread into SaveIt with one tap. The agent grabs the full document, renders a clean visual screenshot, and preserves the text before pages disappear or change.",
    icon: <CameraIcon className="size-5" />,
    badge: "Instant Extraction",
    details: [
      { label: "Content engines", value: "HTML, Markdown, PDF, Video transcripts" },
      { label: "Snapshot latency", value: "Under 1.2 seconds" },
      { label: "Storage fidelity", value: "High-resolution offline preview" },
    ],
  },
  {
    id: "understand",
    step: "02",
    name: "Contextual Understanding",
    headline: "Reading and digesting every idea.",
    description:
      "Instead of just saving a dumb URL, the agent reads the article, extracts the core arguments, identifies authors and entities, and creates semantic embeddings that describe what the content actually means.",
    icon: <BrainCircuitIcon className="size-5" />,
    badge: "Neural Analysis",
    details: [
      { label: "Embedding model", value: "Dense vector conceptual space" },
      { label: "Key points", value: "3-bullet synthesized brief" },
      { label: "Entity extraction", value: "Topics, tools, authors, frameworks" },
    ],
  },
  {
    id: "organize",
    step: "03",
    name: "Zero-Filing Organization",
    headline: "No nested folders to maintain.",
    description:
      "Stop spending your Sunday cleaning folders. The agent clusters related items into living topics, updates relationships as your library grows, and links new knowledge to things you saved months ago.",
    icon: <GitForkIcon className="size-5" />,
    badge: "Knowledge Graph",
    details: [
      { label: "Filing requirement", value: "Zero manual intervention" },
      { label: "Graph links", value: "Bidirectional semantic clusters" },
      { label: "Auto-tagging", value: "Multi-dimensional conceptual tags" },
    ],
  },
  {
    id: "retrieve",
    step: "04",
    name: "Natural Language Retrieval",
    headline: "Ask in plain English. Get it instantly.",
    description:
      "You never need the exact title or domain. Search by your memory: 'that system design diagram from last month' or 'the blog post explaining raft consensus.' The agent surfaces the exact item immediately.",
    icon: <SearchIcon className="size-5" />,
    badge: "Sub-Second Recall",
    details: [
      { label: "Search mode", value: "Meaning-based semantic query" },
      { label: "Response latency", value: "Instantaneous contextual match" },
      { label: "Filter freedom", value: "No rigid keyword restrictions" },
    ],
  },
];

export const AgenticWorkflow = () => {
  const [activeStageId, setActiveStageId] = useState("capture");

  const activeStage =
    PIPELINE_STAGES.find((s) => s.id === activeStageId) || PIPELINE_STAGES[0];

  return (
    <section id="workflow" className="relative py-24 sm:py-32 overflow-hidden bg-[#090708]">
      {/* Background radial atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(255,107,43,0.06)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Section Heading */}
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#ff8533]">
            The Agentic Mechanism
          </p>
          <h2 className="mt-3 font-editorial text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.08] text-[#f7f3ee]">
            No folders. No filing.{" "}
            <span className="text-gradient-ember italic">Just save it.</span>
          </h2>
          <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#c4b5a8]">
            Traditional bookmark managers force you to become a librarian before
            you can save a link. SaveIt.now replaces manual maintenance with an
            autonomous intelligence that captures, comprehends, and organizes your
            entire digital knowledge base in the background.
          </p>
        </div>

        {/* Feature Grid with Campaign Image */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Campaign Image card: Observatory */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#140e11] shadow-2xl transition-all hover:border-[#ff8533]/40">
              <div className="aspect-[4/5] w-full overflow-hidden">
                <picture>
                  <source
                    srcSet="/images/landing-v2/web/observatory-1080.webp"
                    type="image/webp"
                  />
                  <img
                    src="/images/landing-v2/observatory.png"
                    alt="Observatory sanctuary with glowing arc under dusk sky"
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-90 contrast-105"
                    loading="lazy"
                  />
                </picture>
              </div>

              {/* Gradient overlay and editorial caption */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#090708] via-[#090708]/30 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6 text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-medium text-[#ffa366] backdrop-blur-md mb-2">
                  <SparklesIcon className="size-3 text-[#ff8533]" />
                  Autonomous Mind
                </span>
                <h3 className="font-editorial text-xl sm:text-2xl text-white">
                  The Sanctuary for Knowledge
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-[#d4c6ba] leading-relaxed">
                  Your personal agent monitors every bookmark, synthesizing ideas
                  into clarity so nothing slips through the cracks.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Pipeline Steps */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-3">
            {PIPELINE_STAGES.map((stage) => {
              const isSelected = stage.id === activeStageId;
              return (
                <div
                  key={stage.id}
                  onClick={() => setActiveStageId(stage.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setActiveStageId(stage.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  className={`group w-full text-left rounded-2xl p-5 sm:p-6 transition-all cursor-pointer border ${
                    isSelected
                      ? "border-[#ff8533]/50 bg-[#1a1215]/90 shadow-[0_0_30px_rgba(255,107,43,0.15)]"
                      : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                          isSelected
                            ? "bg-[#ff6b2b] text-white shadow-[0_0_20px_rgba(255,107,43,0.4)]"
                            : "bg-white/[0.06] text-[#c4b5a8] group-hover:text-white"
                        }`}
                      >
                        {stage.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium text-[#ff8533]">
                            {stage.step}
                          </span>
                          <h4 className="text-base sm:text-lg font-semibold text-[#f7f3ee]">
                            {stage.name}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs sm:text-sm text-[#ffc299] font-medium">
                          {stage.headline}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-xs rounded-full px-2.5 py-0.5 border ${
                        isSelected
                          ? "border-[#ff8533]/40 bg-[#ff6b2b]/15 text-[#ffa366]"
                          : "border-white/10 bg-white/[0.03] text-[#8f7e72]"
                      }`}
                    >
                      {stage.badge}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-3">
                      <p className="text-xs sm:text-sm leading-relaxed text-[#c4b5a8]">
                        {stage.description}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                        {stage.details.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-lg bg-black/40 border border-white/[0.06] p-2.5"
                          >
                            <span className="block text-[10px] text-[#8f7e72] uppercase tracking-wider">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-xs font-medium text-[#f7f3ee]">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Supported Types Bar */}
        <div className="mt-14 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <h3 className="text-sm font-semibold text-[#f7f3ee] flex items-center gap-2">
                <GlobeIcon className="size-4 text-[#ff8533]" />
                Universal Content Ingestion
              </h3>
              <p className="text-xs text-[#8f7e72] mt-0.5">
                Every format you consume daily is supported without manual configuration.
              </p>
            </div>
            <span className="text-xs font-medium text-[#ffa366] bg-[#ff6b2b]/10 border border-[#ff6b2b]/20 px-3 py-1 rounded-full self-start sm:self-auto">
              Auto-Indexed
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <GlobeIcon className="size-5 text-[#ff8533] mb-2" />
              <p className="text-sm font-medium text-[#f7f3ee]">Articles & Essays</p>
              <p className="text-xs text-[#8f7e72] mt-1">Full text parsed, ads stripped, readability saved.</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <VideoIcon className="size-5 text-[#ff8533] mb-2" />
              <p className="text-sm font-medium text-[#f7f3ee]">YouTube & Video</p>
              <p className="text-xs text-[#8f7e72] mt-1">Transcripts auto-downloaded and queryable by quote.</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <FileTextIcon className="size-5 text-[#ff8533] mb-2" />
              <p className="text-sm font-medium text-[#f7f3ee]">PDFs & Research</p>
              <p className="text-xs text-[#8f7e72] mt-1">Whitepapers indexed with semantic concept anchors.</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <LayersIcon className="size-5 text-[#ff8533] mb-2" />
              <p className="text-sm font-medium text-[#f7f3ee]">Social Threads</p>
              <p className="text-xs text-[#8f7e72] mt-1">X and Mastodon threads saved with media attachments.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
