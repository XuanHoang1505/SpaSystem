import type { ReactNode, Ref } from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

/** The centred card shared by the three auth pages (mẫu Stitch: một Card, max-w-md). */
export function AuthCard({
  eyebrow,
  title,
  description,
  headingRef,
  children,
  footer,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-md py-4 sm:py-10">
      <Card>
        <CardHeader className="gap-3">
          {eyebrow}
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-3xl font-medium tracking-tight outline-none"
          >
            {title}
          </h1>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-5">
          {children}
          {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
        </CardContent>
      </Card>
    </section>
  );
}
