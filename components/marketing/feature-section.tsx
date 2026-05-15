import { SectionContainer } from "@/components/shared/section-container";
import { featureCards } from "@/lib/constants/marketing";

export function FeatureSection() {
  return (
    <SectionContainer id="features" className="py-12 sm:py-16">
      <div className="grid gap-16 lg:grid-cols-[1fr_1fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Features</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built for thoughtful work,<br />not prompt clutter.
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Thynk structures your thinking before sending anything to an AI — so you get results that actually match your intent.
          </p>
        </div>
        <div className="space-y-0 divide-y divide-border">
          {featureCards.map((feature, i) => (
            <div key={feature.title} className="flex gap-6 py-7">
              <span className="font-mono text-sm text-muted-foreground/50 tabular-nums w-6 shrink-0 pt-0.5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}
