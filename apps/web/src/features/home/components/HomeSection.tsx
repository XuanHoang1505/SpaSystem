import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRightIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HomeContainer } from './HomeContainer';

/**
 * One home page block: a centered heading with brand gradient, optional badge & line, an optional "see all" link,
 * inside the content column. `tone="band"` runs a white band across the full width (hairlines top and bottom).
 */
export function HomeSection({
  id,
  badge,
  title,
  description,
  seeAllTo,
  seeAllLabel = 'Xem tất cả',
  tone = 'plain',
  className,
  children,
}: {
  id: string;
  badge?: string;
  title: string;
  description?: string;
  seeAllTo?: string;
  seeAllLabel?: string;
  tone?: 'plain' | 'band';
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(tone === 'band' && 'border-y bg-card py-16 md:py-24', className)}
    >
      <HomeContainer className="space-y-10">
        <div className="relative flex flex-col items-center text-center">
          <div className="mx-auto max-w-2xl space-y-3.5">
            {badge && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary shadow-xs">
                <SparklesIcon className="size-3.5 text-primary" aria-hidden="true" />
                <span>{badge}</span>
              </div>
            )}
            <h2
              id={id}
              className="pb-1 font-heading text-3xl leading-[1.2] tracking-tight sm:text-4xl md:text-[2.65rem] bg-gradient-to-r from-[#1c472d] via-primary to-[#b4566f] bg-clip-text text-transparent"
            >
              {title}
            </h2>
            {description && (
              <p className="mx-auto max-w-xl text-base text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
            <div className="mx-auto h-1 w-12 rounded-full bg-gradient-to-r from-primary to-[#b4566f] opacity-80" />
          </div>

          {seeAllTo && (
            <div className="mt-5 lg:absolute lg:right-0 lg:bottom-1 lg:mt-0">
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
            </div>
          )}
        </div>
        {children}
      </HomeContainer>
    </section>
  );
}
