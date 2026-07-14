import { AboutSection } from "@/features/landing/about-section";
import { BenefitsSection } from "@/features/landing/benefits-section";
import { BypassAISection } from "@/features/landing/bypass-ai-section";
import { CtaSection } from "@/features/landing/cta/cta-section";
import { DemoSection } from "@/features/landing/demo-section";
import { FAQSection } from "@/features/landing/faq-section";
import { FeaturesSection } from "@/features/landing/features-section";
import { Hero } from "@/features/landing/hero";
import { HowItWorksSection } from "@/features/landing/how-it-works-section";
import { InspirationSection } from "@/features/landing/inspiration-section";
import {
  FAQPageJsonLd,
  SoftwareApplicationJsonLd,
} from "@/features/landing/json-ld";
import { LandingHeader } from "@/features/landing/landing-header";
import { PodcastSection } from "@/features/landing/podcast-section";
import { ProblemSection } from "@/features/landing/problem-section";
import { SectionDivider } from "@/features/landing/section-divider";
import { SignedInDialog } from "@/features/landing/signed-in-dialog";
import { StatsDivider } from "@/features/landing/stats-divider";
import { TestimonialsSection } from "@/features/landing/testimonials-section";
import { YourFaceEverytimeSection } from "@/features/landing/your-face-everytime-section";
import { Footer } from "@/features/layout/footer";
import { Button } from "@/components/ui/button";
import { Check, Key, Star } from "lucide-react";
import { SiteConfig } from "@/site-config";
import { cn } from "@/lib/utils";

const homepageFaq = [
  {
    question: `What is ${SiteConfig.title}?`,
    answer: `${SiteConfig.title} is an AI-powered YouTube thumbnail generator built specifically for content creators. Describe your thumbnail, select your saved face and style references, and generate professional thumbnails in seconds - no design skills required.`,
  },
  {
    question: "How does the AI generation work?",
    answer:
      "Our AI uses Google's Gemini model to create thumbnails based on your text description. When you add a Person profile (your face photos) and an Inspiration (style reference), the AI incorporates these to ensure consistency and style matching.",
  },
  {
    question: "What are Person profiles?",
    answer:
      "Person profiles let you save photos and descriptions of faces you want to include in thumbnails. Upload once, and every future thumbnail can feature that exact face consistently. This is essential for building recognizable channel branding.",
  },
  {
    question: "How does the Inspiration feature work?",
    answer:
      "Paste any YouTube video URL, and we extract its thumbnail. Our AI analyzes the style, colors, composition, and mood, then saves it to your library. Reference these Inspirations when generating to match successful thumbnail styles.",
  },
  {
    question: "How many thumbnails can I generate at once?",
    answer:
      "You can generate 1-4 thumbnail variations per request. Each generated image counts toward your plan depending on the model. We recommend generating 4 to have options for A/B testing.",
  },
  {
    question: "What's included in the subscription?",
    answer:
      "The Pro plan at $19/month includes 150 thumbnails. The Ultra plan at $49/month includes 500 thumbnails. Need more? Buy thumbnail packs starting at $2.99.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Yes! Sign up for free and get 5 thumbnails to test the full platform. No credit card required.",
  },
  {
    question: "What image format do thumbnails come in?",
    answer:
      "All thumbnails are generated at YouTube's exact 1280x720 resolution and delivered as high-quality PNG files. Upload directly to YouTube Studio with zero adjustments.",
  },
];

const subscriptionPlans = [
  {
    name: "free",
    description: "Get started with basic thumbnail generation",
    price: 0,
    features: [
      "5 thumbnails included",
      "Up to 2 thumbnails at once",
      "10 inspirations",
      "2 persons",
      "Gemini model only",
      "thumbfa.st watermark on exports",
    ],
  },
  {
    name: "pro",
    description: "For regular creators who need more thumbnails",
    price: 19,
    yearlyPrice: 199,
    isPopular: true,
    features: [
      "150 thumbnails/month",
      "Up to 4 thumbnails at once",
      "Unlimited inspirations",
      "Unlimited persons",
      "Priority support via live chat",
      "Gemini + OpenAI models",
      "No watermark on exports",
    ],
  },
  {
    name: "ultra",
    description: "Maximum thumbnails for power users",
    price: 49,
    yearlyPrice: 499,
    features: [
      "500 thumbnails/month",
      "Up to 4 thumbnails at once",
      "Unlimited inspirations",
      "Unlimited persons",
      "Priority support via live chat",
      "Gemini + OpenAI models",
      "No watermark on exports",
    ],
  },
];

function StaticPricing() {
  return (
    <section className="bg-foreground relative w-full px-4 py-16 md:py-24 lg:py-32">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/70">
            Pricing
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Pick your plan
          </h2>
          <p className="mx-auto mt-3 max-w-md text-lg text-white/50">
            Start creating thumbnails in under a minute. No credit card
            required.
          </p>
        </div>

        <div className="mx-auto grid max-w-md items-center gap-0 lg:max-w-none lg:grid-cols-3">
          {subscriptionPlans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col border p-8",
                plan.isPopular
                  ? "z-10 -mx-1 rounded-2xl border-white/20 bg-white py-12 text-black shadow-2xl"
                  : "rounded-xl border-white/10 bg-white/5",
              )}
            >
              {plan.isPopular ? (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-primary flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
                    <Star className="size-3 fill-current" /> Most Popular
                  </div>
                </div>
              ) : null}
              <h3
                className={cn(
                  "text-lg font-semibold capitalize",
                  plan.isPopular ? "text-black" : "text-white",
                )}
              >
                {plan.name}
              </h3>
              <p
                className={cn(
                  "mt-1 text-sm",
                  plan.isPopular ? "text-black/60" : "text-white/50",
                )}
              >
                {plan.description}
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-4xl font-bold",
                    plan.isPopular ? "text-black" : "text-white",
                  )}
                >
                  ${plan.price}
                </span>
                {plan.price > 0 ? (
                  <span
                    className={
                      plan.isPopular ? "text-black/40" : "text-white/40"
                    }
                  >
                    /mo
                  </span>
                ) : null}
              </div>
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <Check className="text-primary size-4 shrink-0" />
                    <span
                      className={
                        plan.isPopular ? "text-black/70" : "text-white/70"
                      }
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className={cn(
                  "mt-8 w-full text-base font-medium shadow-sm",
                  plan.isPopular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-transparent bg-white text-black hover:bg-white/90 hover:text-black focus-visible:ring-white/40",
                )}
                variant="default"
                asChild
              >
                <a href="/auth/start">Sign up</a>
              </Button>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-6 py-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <Key className="size-4 text-white/40" />
            <div>
              <span className="text-sm font-medium text-white">
                Lifetime Access
              </span>
              <span className="mx-2 text-white/30">.</span>
              <span className="text-sm text-white/40">
                Bring your own API keys, pay once
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-white">$199</span>
            <Button
              size="sm"
              variant="default"
              className="border-transparent bg-white text-black shadow-sm hover:bg-white/90 hover:text-black focus-visible:ring-white/40"
              asChild
            >
              <a href="/auth/start">Sign up</a>
            </Button>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-white/40">
            All plans include basic features like unlimited access and community
            support.
          </p>
          <p className="mt-2 text-white/40">
            Need a custom plan?{" "}
            <a
              href="/contact"
              className="text-primary font-medium hover:underline"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

export function TanStackHomePage() {
  return (
    <div className="force-light-theme bg-background text-foreground relative flex h-fit flex-col">
      <SoftwareApplicationJsonLd />
      <FAQPageJsonLd faq={homepageFaq} />
      <SignedInDialog />
      <LandingHeader />

      <div className="pt-20">
        <Hero />
      </div>

      <StatsDivider disableLiveStats />
      <InspirationSection />
      <YourFaceEverytimeSection />
      <ProblemSection />
      <BenefitsSection />
      <DemoSection />
      <PodcastSection />

      <div id="features">
        <FeaturesSection />
      </div>

      <HowItWorksSection />
      <SectionDivider />
      <BypassAISection />
      <SectionDivider />
      <TestimonialsSection />
      <SectionDivider />
      <AboutSection />
      <SectionDivider />

      <div id="pricing">
        <StaticPricing />
      </div>

      <FAQSection faq={homepageFaq} />
      <CtaSection />
      <Footer />
    </div>
  );
}
