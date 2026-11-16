import { siteInfo } from '@/config/siteInfo';
import { HomeContainer } from '@/features/home';
import { demoStory } from '../aboutDemoContent';

/** Opening of the about page: the spa's name and story beside a tall photo of the space. */
export function AboutIntro() {
  return (
    <section aria-labelledby="about-title" className="pt-10 md:pt-16">
      <HomeContainer className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="space-y-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary">VỀ CHÚNG TÔI</p>
          <h1
            id="about-title"
            className="pb-1 font-heading text-4xl leading-[1.1] tracking-tight text-balance sm:text-5xl"
          >
            {siteInfo.name},
            <br />
            <em className="font-normal text-primary">{siteInfo.tagline.toLowerCase()}.</em>
          </h1>
          <div className="max-w-xl space-y-4 text-base leading-relaxed text-muted-foreground">
            {demoStory.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
        <img
          src={demoStory.photo}
          alt="Không gian thư giãn tại spa"
          width={1200}
          height={1500}
          fetchPriority="high"
          className="aspect-[4/5] w-full rounded-sm bg-muted object-cover md:aspect-auto md:h-[min(64svh,540px)]"
        />
      </HomeContainer>
    </section>
  );
}
