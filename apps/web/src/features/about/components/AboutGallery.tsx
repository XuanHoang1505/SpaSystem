import { HomeContainer } from '@/features/home';
import { cn } from '@/lib/utils';
import { demoGallery } from '../aboutDemoContent';

/**
 * The space as a mosaic: one large photo on the left spanning two rows, four smaller ones beside it (a single column
 * on phones). Captions sit on a soft scrim at the bottom of each photo.
 */
export function AboutGallery() {
  return (
    <section aria-labelledby="about-gallery" className="border-y bg-card py-14 md:py-16">
      <HomeContainer className="space-y-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:items-end">
          <h2
            id="about-gallery"
            className="font-heading text-3xl leading-tight tracking-tight md:text-[2.75rem]"
          >
            Không gian của chúng tôi
          </h2>
          <p className="max-w-md text-muted-foreground lg:justify-self-end">
            Ánh sáng dịu, mùi thảo mộc nhẹ và những căn phòng riêng để bạn thật sự được nghỉ ngơi.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 md:auto-rows-[min(24svh,210px)] md:grid-cols-4">
          {demoGallery.map((photo, index) => (
            <li
              key={photo.src}
              className={cn(
                'relative h-60 overflow-hidden rounded-sm bg-muted md:h-auto',
                index === 0 && 'sm:col-span-2 md:row-span-2',
              )}
            >
              <img
                src={photo.src}
                alt={photo.caption}
                loading="lazy"
                className="size-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:hover:scale-[1.03]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-foreground/60 to-transparent"
              />
              <span className="absolute bottom-3 left-4 text-sm font-medium text-background">
                {photo.caption}
              </span>
            </li>
          ))}
        </ul>
      </HomeContainer>
    </section>
  );
}
