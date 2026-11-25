import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

/**
 * Đầu trang danh sách (mẫu Stitch): `band` = dải nền nhạt tràn lề có breadcrumb (SCR-W02);
 * không `band` = eyebrow + tiêu đề trên nền trang (SCR-W04). `children` là ô tìm kiếm.
 */
export function CatalogPageHeader({
  title,
  description,
  eyebrow,
  breadcrumb,
  band = false,
  children,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  breadcrumb?: string;
  band?: boolean;
  children?: ReactNode;
}) {
  return (
    <header
      className={cn('flex flex-col items-center space-y-2.5 text-center', band && 'border-b pb-6')}
    >
      {breadcrumb && (
        <Breadcrumb aria-label="Vị trí trang" className="self-start">
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Trang chủ</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{breadcrumb}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      {eyebrow && (
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
      )}
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
        {title}
      </h1>
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      {children && <div className="w-full max-w-md pt-1.5 text-left sm:max-w-lg">{children}</div>}
    </header>
  );
}
