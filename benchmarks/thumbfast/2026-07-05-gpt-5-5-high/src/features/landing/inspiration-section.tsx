import { motion } from "motion/react";
import { ArrowDown, Layers, Sparkles } from "lucide-react";
import Image from "@/compat/image";

const TEMPLATE_IMAGE = "/landing/template-inspiration.png";

const RESULT_IMAGES = [
  "/landing/template-result-0.jpeg",
  "/landing/template-result-1.jpeg",
  "/landing/template-result-2.jpeg",
];

type InspirationItem = { title: string; url: string };

const INSPIRATION_ITEMS: InspirationItem[] = [
  {
    title: "Small Investment Big Return",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292569203-Day_Trading_for_Beginners__My_SECRET_to_Start_FAST_.png",
  },
  {
    title: "Cursor Guide Explained",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292567729-Cursor_AI_coding__NO_experience_needed__Here_s_why_.png",
  },
  {
    title: "Decoding Tech Stack",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292566006-Cursor_AI__The_ONLY_Beginner_Tutorial_You_Need_.png",
  },
  {
    title: "AI Battle: Who Wins?",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292564473-Claude_Opus_4_6_vs_GPT_5_3_Codex__The_winner_is_insane.png",
  },
  {
    title: "Favorite AI Coding Agent",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292562013-Claude_Code__This_SECRET_10xed_my_engineering_.png",
  },
  {
    title: "Automate Your Life",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292560454-Claude_Code__How_I_automated_90__of_my_work_and_life.png",
  },
  {
    title: "AI Coding Revolution",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292558689-Claude_AI_is_UNREAL_for_apps__Did_I_just_break_coding_.png",
  },
  {
    title: "AI Subscription Dilemma",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292556521-ChatGPT_Plus_vs_Gemini_2_0__One_is_a_waste_of_money.png",
  },
  {
    title: "GPT-5 Unveiled",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292554871-ChatGPT_5__You_NEED_This__7_Minutes__.png",
  },
  {
    title: "AI Automation Unleashed",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292553250-Building_AI_Automations__This_Changes_EVERYTHING_.png",
  },
  {
    title: "GitHub Zero to Pro",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292549906-Beginner_to_GitHub_PRO_in_46_mins__UNBELIEVABLE_.png",
  },
  {
    title: "AI App Creation",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292547568-Beginner__BUILD_an_AI_App__NO_CODE_Secret__.png",
  },
  {
    title: "Zapier App Automation",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292546001-Automate_Everything__Master_Zapier_in_Just_7_Minutes.png",
  },
  {
    title: "Earning $500 Daily",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292544572-AI_Money_HACK__ZERO_Effort__Literally_.png",
  },
  {
    title: "Money While You Sleep",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292542847-AI_Money__The_LAZIEST_Hack__Beginners_ONLY__.png",
  },
  {
    title: "AI Coding Assistant",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292541218-AI_Code_Editor__1__3_Min_Demo_That_Will_SHOCK_You_.png",
  },
  {
    title: "AI Crash Coming?",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292539622-AI_Bubble__Agencies_Will_DIE_Without_This_Secret_.png",
  },
  {
    title: "AI Money Machine",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292538035-AI_BLEW_UP_My_YouTube_Channel_in_JUST_7_Days_.png",
  },
  {
    title: "Digital Simplicity Unveiled",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292536529-Add_a_Changelog_NOW_Or_Your_App_Will_FAIL_.png",
  },
  {
    title: "Become ChatGPT Pro",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292534277-23_ChatGPT_Hacks_So_UNFAIR_It_s_Cheating_.png",
  },
  {
    title: "Keep Going YouTube",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292531939-8_Signs_Your_Small_Channel_Is_Finally_About_To_Blow_Up.png",
  },
  {
    title: "Digital Solitude Waits",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292529856-8_SECRETS_Young_Men_NEED_to_Know__Learned_Alone_.png",
  },
  {
    title: "YouTube Money Promise",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292528211-7_YouTube_Updates_That_Will_CHANGE_Your_Channel_.png",
  },
  {
    title: "Zero to Wealth",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292526584-7_AI_Ideas__Become_a_Millionaire_INSTANTLY_.png",
  },
  {
    title: "5 AI Future Steps",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292525030-5_SIMPLE_Ways_to_BREAK_INTO_AI__Beginners_ONLY_.png",
  },
  {
    title: "Google's Keyword Strategy",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292523278-5_massive_keyword_gaps_Google_is_begging_you_to_fill.png",
  },
  {
    title: "Thinking AI Success",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292521578-5_AI_Loopholes_to_Make__1_000_000__So_EASY__.png",
  },
  {
    title: "Google Business Guide",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292518600-1_Google_Business_Profile_SEO_hack_that_feels_like_cheating.png",
  },
  {
    title: "YouTube Growth Course",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771292516805-0_to__10_000_Month__Start_This_Faceless_YouTube_Business.png",
  },
  {
    title: "Claude Code: Débutant à Pro",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/anonymized-1771291685749.jpeg",
  },
  {
    title: "AI Agents Explained",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771237309114-AI_Agents__Explained_Like_NEVER_Before_.png",
  },
  {
    title: "Idea to App Fast",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771237300543-100__No_Code__Build___Sell_AI_Web_Apps.png",
  },
  {
    title: "Beyond the 9-5",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771237293600-7_Faceless_Niches_Will_OUTEARN_Your_Job_.png",
  },
  {
    title: "Discover Profitable Niches",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771237291415-5_Secrets__Pick_a_YouTube_Niche___Get_RICH_.png",
  },
  {
    title: "From Zero to Millions",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/1771237285922-3_SECRET_Steps_to_GO_VIRAL_on_TikTok_NOW_.png",
  },
  {
    title: "Clawdbot Changes Everything",
    url: "https://thumbnail-ia.mlvcdn.com/inspirations/anonymized-1771236709637.jpeg",
  },
];

// Split into two rows for two-row marquee
const ROW_1 = INSPIRATION_ITEMS.slice(0, Math.ceil(INSPIRATION_ITEMS.length / 2));
const ROW_2 = INSPIRATION_ITEMS.slice(Math.ceil(INSPIRATION_ITEMS.length / 2));

function InspirationCard({ item }: { item: InspirationItem }) {
  return (
    <div className="shrink-0 w-[180px] sm:w-[210px] md:w-[240px]">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-zinc-700/60 shadow-md">
        <Image
          src={item.url}
          alt={item.title}
          fill
          className="object-cover opacity-80 transition-opacity hover:opacity-100"
        />
      </div>
    </div>
  );
}

export function InspirationSection() {
  return (
    <section className="overflow-hidden bg-zinc-950 py-20 text-white lg:py-28">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400">
            <Layers className="size-4" />
            Template Mode
          </div>
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
            Template ={" "}
            <span className="text-red-500">endless thumbnails</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Start from any thumbnail you love. Use it as a template and let our
            AI slide it into whatever variation you want.
          </p>
        </motion.div>

        {/* Template — large and prominent */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-12 w-full max-w-2xl"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Template
          </p>
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-zinc-600 shadow-2xl shadow-black/60">
            <Image
              src={TEMPLATE_IMAGE}
              alt="Inspiration template thumbnail"
              fill
              className="object-cover"
            />
          </div>
        </motion.div>

        {/* Arrow down */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="my-6 flex flex-col items-center gap-1"
        >
          <ArrowDown className="size-7 text-red-500" />
          <span className="text-xs font-medium text-zinc-500">
            generates any of these
          </span>
        </motion.div>

        {/* Results — smaller grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mx-auto w-full max-w-2xl"
        >
          <div className="grid grid-cols-3 gap-3">
            {RESULT_IMAGES.map((src, index) => (
              <motion.div
                key={src}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.55 + index * 0.08 }}
                className="relative aspect-video overflow-hidden rounded-xl border-2 border-red-500/60 shadow-lg shadow-red-500/10"
              >
                <Image
                  src={src}
                  alt={`Generated thumbnail variation ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-8 text-zinc-400"
        >
          One template.{" "}
          <span className="font-semibold text-white">
            Unlimited possibilities.
          </span>
        </motion.p>
      </div>

      {/* Infinite scrolling inspiration library */}
      <div className="relative mt-16">
        {/* Edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-zinc-950 to-transparent sm:w-28" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-zinc-950 to-transparent sm:w-28" />

        {/* Row 1 — left to right */}
        <div className="animate-marquee flex gap-4 pb-4">
          {[...ROW_1, ...ROW_1].map((item, i) => (
            <InspirationCard key={`r1-${i}`} item={item} />
          ))}
        </div>

        {/* Row 2 — right to left */}
        <div className="animate-marquee-reverse flex gap-4 pt-0">
          {[...ROW_2, ...ROW_2].map((item, i) => (
            <InspirationCard key={`r2-${i}`} item={item} />
          ))}
        </div>
      </div>

      {/* 100+ templates callout */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-10 flex flex-col items-center gap-3"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 shadow-lg">
          <Sparkles className="size-4 text-red-400" />
          We have more than 100 templates ready for you
        </div>
      </motion.div>
    </section>
  );
}
