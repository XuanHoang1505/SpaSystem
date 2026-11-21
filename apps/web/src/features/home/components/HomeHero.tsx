import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { homeHeroSlides } from '../homeHeroSlides';
import { LeafSprig, Wash } from './HomeBackdrop';
import { HomeContainer } from './HomeContainer';

const SLIDE_INTERVAL = 3000;

/** Overlaid grid slides keep the banner height stable, including when text wraps on mobile. */
export function HomeHero() {
  const [active, setActive] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const sectionRef = useRef<HTMLElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    let inViewport = true;
    const update = () => setIsVisible(inViewport && !document.hidden);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver(([entry]) => {
            inViewport = entry?.isIntersecting ?? false;
            update();
          });
    if (sectionRef.current) observer?.observe(sectionRef.current);
    document.addEventListener('visibilitychange', update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const autoPlaying = !isFocused && !reducedMotion && !isHovered && isVisible;
  useEffect(() => {
    if (!autoPlaying) return;
    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % homeHeroSlides.length);
    }, SLIDE_INTERVAL);
    return () => window.clearTimeout(timer);
  }, [active, autoPlaying]);

  const selectSlide = (index: number) => {
    setActive((index + homeHeroSlides.length) % homeHeroSlides.length);
  };

  return (
    <section
      ref={sectionRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Giới thiệu Như Nguyệt Spa"
      data-active-slide={active + 1}
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault();
          selectSlide(active + (event.key === 'ArrowRight' ? 1 : -1));
        }
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchCancel={() => {
        touchStart.current = null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0];
        touchStart.current = null;
        if (!start || !end) return;
        const dx = end.clientX - start.x;
        const dy = end.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          selectSlide(active + (dx < 0 ? 1 : -1));
        }
      }}
    >
      <div className="grid" aria-live={autoPlaying ? 'off' : 'polite'} aria-atomic="false">
        {homeHeroSlides.map((slide, index) => {
          const Title = index === active ? 'h1' : 'h2';
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${homeHeroSlides.length}`}
              aria-hidden={index !== active}
              inert={index !== active}
              className={cn(
                'relative isolate col-start-1 row-start-1 flex min-w-0 flex-col transition-opacity duration-700 motion-reduce:transition-none md:block',
                index === active ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <div
                aria-hidden="true"
                className="relative h-64 [mask-image:linear-gradient(to_top,transparent_2%,black_45%)] sm:h-80 md:absolute md:inset-0 md:-z-10 md:h-auto md:[mask-image:linear-gradient(to_right,transparent_38%,black_68%),linear-gradient(to_top,transparent_2%,black_28%)] md:[mask-composite:intersect]"
              >
                <img
                  src={slide.image}
                  alt=""
                  fetchPriority={index === 0 ? 'high' : 'low'}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  width={1920}
                  height={1280}
                  style={{ objectPosition: slide.imagePosition }}
                  className="size-full object-cover md:absolute md:inset-y-0 md:right-0 md:w-[62%]"
                />
              </div>
              <HomeContainer className="pt-2 pb-6 md:flex md:min-h-[620px] md:items-center md:py-24">
                <div className="max-w-xl space-y-6">
                  <p className="text-xs font-semibold tracking-[0.2em] text-primary">
                    {slide.eyebrow}
                  </p>
                  <Title className="pb-1 font-heading text-4xl leading-[1.1] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
                    {slide.title}
                    <br />
                    <em className="font-normal text-primary">{slide.emphasis}</em>
                  </Title>
                  <p className="max-w-sm text-base text-muted-foreground">{slide.description}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="lg">
                      <Link to={slide.primary.to}>
                        {slide.primary.label}
                        <ArrowRightIcon aria-hidden="true" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="bg-background/80">
                      <Link to={slide.secondary.to}>{slide.secondary.label}</Link>
                    </Button>
                  </div>
                </div>
              </HomeContainer>
            </div>
          );
        })}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 hidden md:block"
      >
        <Wash className="-top-16 -left-56 size-[36rem] opacity-60" />
        <LeafSprig className="-top-28 -left-14 w-52 rotate-[205deg] text-chart-2 opacity-35 lg:w-60" />
        <LeafSprig className="-bottom-14 left-[31%] w-40 rotate-[8deg] text-chart-2 opacity-35 lg:w-48" />
        <LeafSprig className="bottom-4 -left-10 w-28 -scale-x-100 text-primary opacity-20" />
      </div>

      <HomeContainer className="relative z-10 pb-6 md:absolute md:inset-x-0 md:bottom-6 md:pb-0">
        <div
          className="flex flex-wrap items-center gap-2 sm:gap-3"
          role="group"
          aria-label="Điều khiển banner"
        >
          <div className="flex items-center gap-1">
            {homeHeroSlides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                className="grid size-10 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Xem banner ${index + 1}: ${slide.eyebrow}`}
                aria-current={active === index ? 'true' : undefined}
                onClick={() => selectSlide(index)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-2 rounded-full transition-all motion-reduce:transition-none',
                    active === index ? 'w-7 bg-primary' : 'w-2 bg-primary/25',
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </HomeContainer>
    </section>
  );
}
