import { Typography } from "@/components/nowts/typography";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ClientMarkdown } from "../markdown/client-markdown";
import { SectionLayout } from "./section-layout";

type Faq = {
  question: string;
  answer: string;
};

type FeaturesPreviewProps = {
  faq: Faq[];
};

export const FAQSection = (props: FeaturesPreviewProps) => {
  return (
    <SectionLayout size="lg" className="flex max-lg:flex-col">
      <div className="flex-1 space-y-2">
        <Typography className="text-primary font-extrabold uppercase">
          FAQ
        </Typography>
        <Typography variant="h2" className="text-5xl">
          Frequently Asked Questions
        </Typography>
      </div>
      <div className="flex-1">
        <Accordion type="single" collapsible>
          {props.faq.map((e, i) => {
            return (
              <AccordionItem value={`item-${i}`} key={i}>
                <AccordionTrigger className="text-left text-lg">
                  {e.question}
                </AccordionTrigger>
                <AccordionContent className="text-base">
                  <ClientMarkdown>{e.answer}</ClientMarkdown>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </SectionLayout>
  );
};
