import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HomeContainer } from './HomeContainer';

/**
 * One home page block: a large serif heading, an optional line under it, an optional "see all" link, the content,
 * inside the content column. `tone="band"` runs a white band across the full width (hairlines top and bottom) to set
 * the block apart from its neighbours.
 */
export function HomeSection({
  id,
  title,
  description,
  seeAllTo,
  seeAllLabel = 'Xem tất cả',
  tone = 'plain',
  children,
}: {
  id: string;
  title: string;
  description?: string;
  seeAllTo?: string;
  seeAllLabel?: string;
  tone?: 'plain' | 'band';
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(tone === 'band' && 'border-y bg-card py-16 md:py-24')}
    >
      <HomeContainer className="space-y-10">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="max-w-2xl space-y-3">
            <h2
              id={id}
              className="font-heading text-3xl leading-tight tracking-tight md:text-[2.75rem]"
            >
              {title}
            </h2>
            {description && <p className="max-w-xl text-muted-foreground">{description}</p>}
          </div>
          {seeAllTo && (
            // An outline button that stands off the section's own background (white on the page, page tone on a band).
            <Button
              asChild
              variant="outline"
              className={cn(
                'group border-primary/30 px-4 text-primary hover:border-primary hover:bg-accent hover:text-accent-foreground',
                tone === 'band' ? 'bg-background' : 'bg-card',
              )}
            >
              <Link to={seeAllTo}>
                {seeAllLabel}
                <ArrowUpRightIcon
                  className="size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          )}
        </div>
        {children}
      </HomeContainer>
    </section>
  );
}
