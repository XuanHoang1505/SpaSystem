import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The readable content column inside a full-width home section (same width as the rest of the site). */
export function HomeContainer({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
  );
}
