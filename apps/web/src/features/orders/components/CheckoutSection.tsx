import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * One block of the cart, checkout and order pages: a numbered title (the step of the form), an optional one-line description
 * and an optional element on the right, then the content. Every block uses it so they share one look.
 */
export function CheckoutSection({
  step,
  title,
  description,
  aside,
  className,
  children,
}: {
  step?: number;
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={cn('space-y-4 rounded-2xl border bg-card p-5 shadow-2xs sm:p-6', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {step !== undefined && (
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
            >
              {step}
            </span>
          )}
          <div className="min-w-0 space-y-0.5">
            <h2
              id={headingId}
              className="font-heading text-lg leading-7 font-semibold text-foreground"
            >
              {title}
            </h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
