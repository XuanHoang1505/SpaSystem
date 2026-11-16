import { Link } from 'react-router-dom';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HomeContainer } from '@/features/home';
import { demoFaqs } from '../aboutDemoContent';

/** Common questions before a first visit: heading and a way to ask the assistant on the left, answers on the right. */
export function AboutFaq() {
  return (
    <section aria-labelledby="about-faq">
      <HomeContainer className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <h2
            id="about-faq"
            className="font-heading text-3xl leading-tight tracking-tight md:text-[2.75rem]"
          >
            Trước khi bạn ghé
          </h2>
          <p className="max-w-sm text-muted-foreground">
            Những điều khách thường hỏi trước buổi đầu tiên. Chưa thấy câu bạn cần? Hãy hỏi trợ lý
            hoặc gọi cho spa.
          </p>
          <Button asChild variant="outline" className="bg-background/70">
            <Link to="/ai-assistant">Hỏi trợ lý AI</Link>
          </Button>
        </div>
        <div className="divide-y border-y">
          {demoFaqs.map((faq) => (
            <details key={faq.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDownIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground group-open:rotate-180 motion-safe:transition-transform"
                />
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </HomeContainer>
    </section>
  );
}
