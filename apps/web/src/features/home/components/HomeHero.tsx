import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import heroImage from '@/assets/images/home-hero.webp';
import { Button } from '@/components/ui/button';
import { LeafSprig, Wash } from './HomeBackdrop';
import { HomeContainer } from './HomeContainer';

/**
 * Full-width home banner: the photo fills the right of the viewport and fades into the page on its left and bottom
 * edges (CSS masks, so the branches behind the page show through), with the message on the left inside the content
 * column. On phones the photo stacks above the text and fades downwards.
 */
export function HomeHero() {
  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative isolate flex flex-col overflow-hidden md:block"
    >
      {/*
        Photo (mirrored in the file so the face sits on the right). On desktop the masked layer covers the whole
        section, so its own edge is hidden by the section's overflow; the photo fills the right 62% and its left edge
        falls inside the fully transparent part of the mask. A masked layer whose edge sits inside the section shows
        a 1px seam in Chrome when the section starts on a fractional pixel.
      */}
      <div
        aria-hidden="true"
        className="relative h-64 [mask-image:linear-gradient(to_top,transparent_2%,black_45%)] sm:h-80 md:absolute md:inset-0 md:-z-10 md:h-auto md:[mask-image:linear-gradient(to_right,transparent_38%,black_68%),linear-gradient(to_top,transparent_2%,black_28%)] md:[mask-composite:intersect]"
      >
        <img
          src={heroImage}
          alt=""
          fetchPriority="high"
          width={1920}
          height={1280}
          className="size-full object-cover object-[65%_40%] md:absolute md:inset-y-0 md:right-0 md:w-[62%]"
        />
      </div>

      {/*
        Watercolour leaves and a soft wash behind the message (desktop). Painted after the photo but on the same layer,
        so they sit over its fully transparent left part and under the text. Decoration only.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 hidden md:block"
      >
        <Wash className="-top-16 -left-56 size-[36rem] opacity-60" />
        <LeafSprig className="-top-28 -left-14 w-52 rotate-[205deg] text-chart-2 opacity-35 lg:w-60" />
        <LeafSprig className="-bottom-14 left-[31%] w-40 rotate-[8deg] text-chart-2 opacity-35 lg:w-48" />
        <LeafSprig className="bottom-4 -left-10 w-28 -scale-x-100 text-primary opacity-20" />
      </div>

      <HomeContainer className="pt-2 pb-10 md:flex md:min-h-[620px] md:items-center md:py-20">
        <div className="max-w-xl space-y-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary">NHƯ NGUYỆT SPA</p>
          <h1
            id="home-hero-title"
            className="pb-1 font-heading text-4xl leading-[1.1] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
          >
            Chăm sóc sắc đẹp,
            <br />
            <em className="font-normal text-primary">lan tỏa bình an.</em>
          </h1>
          <p className="max-w-sm text-base text-muted-foreground">
            Trải nghiệm không gian thư giãn và liệu trình chăm sóc da cùng đội ngũ kỹ thuật viên của
            Như Nguyệt Spa.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/services">
                Đặt lịch ngay <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-background/80">
              <Link to="/packages">Xem gói liệu trình</Link>
            </Button>
          </div>
        </div>
      </HomeContainer>
    </section>
  );
}
