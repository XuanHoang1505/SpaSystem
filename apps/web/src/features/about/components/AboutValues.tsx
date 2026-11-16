import { HomeContainer } from '@/features/home';
import { cn } from '@/lib/utils';
import { demoSpacePhotos, demoValues } from '../aboutDemoContent';

/** What the spa stands for, as a list beside two photos of the space, on a full-width white band. */
export function AboutValues() {
  return (
    <section aria-labelledby="about-values" className="border-y bg-card py-14 md:py-16">
      {/* Photos are capped by the viewport height on wide screens, so the whole band fits one screen. */}
      <HomeContainer className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="grid grid-cols-2 gap-4 pb-6">
          {demoSpacePhotos.map((photo, index) => (
            <img
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              width={900}
              height={1200}
              className={cn(
                'aspect-[3/4] w-full rounded-sm bg-muted object-cover lg:aspect-auto lg:h-[min(52svh,420px)]',
                index === 1 && 'translate-y-6',
              )}
            />
          ))}
        </div>
        <div className="space-y-8">
          <h2
            id="about-values"
            className="font-heading text-3xl leading-tight tracking-tight md:text-[2.75rem]"
          >
            Điều chúng tôi giữ trong mỗi buổi chăm sóc
          </h2>
          <ul className="space-y-7">
            {demoValues.map(({ icon: Icon, title, description }) => (
              <li key={title} className="grid grid-cols-[auto_1fr] gap-4">
                <span className="grid size-11 place-items-center rounded-sm bg-accent text-accent-foreground">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="space-y-1">
                  <h3 className="font-medium text-foreground">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </HomeContainer>
    </section>
  );
}
