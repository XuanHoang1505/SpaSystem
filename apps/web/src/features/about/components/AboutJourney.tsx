import { HomeContainer } from '@/features/home';
import { demoJourney } from '../aboutDemoContent';

/** One visit, step by step: large Lora numerals over short texts, five columns on wide screens. */
export function AboutJourney() {
  return (
    <section aria-labelledby="about-journey">
      <HomeContainer className="space-y-12">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-end">
          <h2
            id="about-journey"
            className="font-heading text-3xl leading-tight tracking-tight md:text-[2.75rem]"
          >
            Một buổi chăm sóc tại spa
          </h2>
          <p className="max-w-md text-muted-foreground lg:justify-self-end">
            Từ lúc đặt lịch đến khi về nhà, bạn luôn biết điều gì sắp diễn ra.
          </p>
        </div>
        <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {demoJourney.map((step, index) => (
            <li key={step.title} className="space-y-3 border-t pt-6">
              <span aria-hidden="true" className="block font-heading text-4xl text-primary/70">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="font-medium text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </HomeContainer>
    </section>
  );
}
