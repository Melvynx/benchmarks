import { FAQSection } from "@/features/landing/faq-section";
import { FAQPageJsonLd } from "@/features/landing/json-ld";

type ToolFaqProps = {
  faq: { question: string; answer: string }[];
};

export function ToolFaq({ faq }: ToolFaqProps) {
  return (
    <>
      <FAQPageJsonLd faq={faq} />
      <FAQSection faq={faq} />
    </>
  );
}
