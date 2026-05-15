import { SectionContainer } from "@/components/shared/section-container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqItems } from "@/lib/constants/marketing";

export function FaqSection() {
  return (
    <SectionContainer id="faq" className="py-12 sm:py-16">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
          Questions
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Common questions.
        </h2>
      </div>

      <div className="border border-border bg-card px-5 py-3 sm:px-8">
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((item, index) => (
            <AccordionItem key={item.question} value={`item-${index}`} className="border-border/70">
              <AccordionTrigger className="py-5 text-sm text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-7 text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </SectionContainer>
  );
}
