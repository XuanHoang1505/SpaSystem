import type { ReactNode, Ref } from 'react';

/** Header + content of the three auth pages; AuthLayout already draws the surrounding card. */
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
    <section className="grid gap-6">
      <div className="grid gap-3">
        {eyebrow}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-3xl font-medium tracking-tight outline-none"
        >
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-5">
        {children}
        {footer && <div className="text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </section>
  );
}
