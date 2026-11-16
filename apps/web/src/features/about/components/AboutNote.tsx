import { HomeContainer } from '@/features/home';
import { siteInfo } from '@/config/siteInfo';
import { demoNote } from '../aboutDemoContent';

/** The spa's own words: a large quote on a full-width brand band, with two short paragraphs beside it. */
export function AboutNote() {
  return (
    <section
      aria-label="Lời nhắn từ spa"
      className="bg-primary py-16 text-primary-foreground md:py-24"
    >
      <HomeContainer className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:gap-16">
        <figure className="space-y-6">
          <blockquote className="font-heading text-2xl leading-snug text-balance italic md:text-[2.25rem]">
            “{demoNote.quote}”
          </blockquote>
          <figcaption className="text-sm text-primary-foreground/75">{siteInfo.name}</figcaption>
        </figure>
        <div className="space-y-4 text-sm leading-relaxed text-primary-foreground/80">
          {demoNote.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </HomeContainer>
    </section>
  );
}
