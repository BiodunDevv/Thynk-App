import { SectionContainer } from "@/components/shared/section-container";
import { useCases } from "@/lib/constants/marketing";

export function UseCasesSection() {
  return (
    <SectionContainer id="use-cases" className="py-12 sm:py-16">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
          Use cases
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Designed for people who already do real work with AI.
        </h2>
      </div>

      <dl className="mt-8 divide-y divide-border border-t border-border">
        {useCases.map((item) => (
          <div key={item.title} className="flex flex-col gap-1 py-5 sm:flex-row sm:gap-16">
            <dt className="w-full shrink-0 text-sm font-semibold text-foreground sm:w-36">{item.title}</dt>
            <dd className="text-sm leading-6 text-muted-foreground">{item.description}</dd>
          </div>
        ))}
      </dl>
    </SectionContainer>
  );
}
