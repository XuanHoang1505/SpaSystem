import { ChevronDownIcon, MessageCircleQuestionIcon, SparklesIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { demoFaqs } from '@/features/about/aboutDemoContent';
import { ContactIntro } from '@/features/contact';
import { HomeBackdrop, HomeContainer } from '@/features/home';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** Contact page: compact centered header, 4 contact channels, message form beside map & self-service, and common questions. */
export function ContactPage() {
  useDocumentTitle('Liên hệ');
  return (
    <div className="relative isolate pb-20">
      <HomeBackdrop />
      <HomeContainer className="space-y-12 pt-8">
        <ContactIntro />

        <section
          aria-labelledby="contact-faq"
          className="grid gap-8 rounded-2xl border bg-card p-6 shadow-xs sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12"
        >
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Giải đáp nhanh
            </p>
            <h2
              id="contact-faq"
              className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              <MessageCircleQuestionIcon className="size-6 text-primary" aria-hidden="true" />
              Trước khi bạn ghé spa
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Những câu hỏi khách hàng thường quan tâm trước buổi hẹn đầu tiên. Nếu cần tư vấn riêng
              theo tình trạng da, bạn có thể hỏi ngay Trợ lý AI.
            </p>
            <div className="pt-2">
              <Button asChild variant="outline" size="sm" className="bg-background">
                <Link to="/ai-assistant">
                  <SparklesIcon className="size-3.5 text-primary" aria-hidden="true" />
                  Hỏi trợ lý AI tư vấn
                </Link>
              </Button>
            </div>
          </div>

          <div className="divide-y rounded-xl border bg-background/60">
            {demoFaqs.map((faq) => (
              <details key={faq.question} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-foreground sm:text-base [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </HomeContainer>
    </div>
  );
}
