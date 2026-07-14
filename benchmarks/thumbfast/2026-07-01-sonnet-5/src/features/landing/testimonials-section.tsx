import { Typography } from "@/components/nowts/typography";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Quote, Star } from "lucide-react";
import Image from "@/compat/image";
import { SectionLayout } from "./section-layout";

export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  subscribers: string;
  result: string;
  image: string;
};

export const testimonials: Testimonial[] = [
  {
    quote: "The tool is really enjoyable to use!",
    author: "Alex So Yes",
    role: "Content Creator",
    subscribers: "",
    result: "Great experience",
    image: "/landing/testimonial-1.png",
  },
  {
    quote: "I love this product.",
    author: "Alex Paris",
    role: "YouTuber",
    subscribers: "",
    result: "Worth it",
    image: "/landing/testimonial-2.png",
  },
  {
    quote: "I subscribe pro after using it for my youtube videos :D",
    author: "Content Creator",
    role: "YouTuber",
    subscribers: "",
    result: "Amazing tool",
    image: "/landing/testimonial-3.png",
  },
];

export function TestimonialsSection() {
  return (
    <SectionLayout
      size="lg"
      containerClassName="bg-muted/30"
      className="text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Typography variant="h2" className="text-foreground">
          Creators Are Getting Results
        </Typography>
        <Typography
          variant="lead"
          className="text-muted-foreground mx-auto mt-4 max-w-2xl"
        >
          Join thousands of YouTube creators who've transformed their thumbnail
          workflow.
        </Typography>
      </motion.div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={testimonial.author}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={cn(
              "bg-card group relative flex flex-col overflow-hidden rounded-2xl border p-6 text-left transition-all hover:shadow-lg",
            )}
          >
            <div className="text-primary/20 absolute -top-4 -right-4">
              <Quote className="size-24" />
            </div>

            <div className="relative">
              <div className="mb-4 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="text-primary size-4 fill-current"
                  />
                ))}
              </div>

              <Typography
                variant="p"
                className="text-foreground mb-6 text-sm leading-relaxed"
              >
                "{testimonial.quote}"
              </Typography>

              <div className="mt-auto flex items-center gap-4">
                <div className="relative size-12 overflow-hidden rounded-full">
                  <Image
                    src={testimonial.image}
                    alt={testimonial.author}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <Typography
                    variant="p"
                    className="text-foreground text-sm font-semibold"
                  >
                    {testimonial.author}
                  </Typography>
                  <Typography variant="muted" className="text-xs">
                    {testimonial.role}
                  </Typography>
                  {testimonial.subscribers && (
                    <Typography variant="muted" className="text-xs">
                      {testimonial.subscribers}
                    </Typography>
                  )}
                </div>
              </div>

              <div className="bg-primary/10 text-primary mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium">
                {testimonial.result}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionLayout>
  );
}
