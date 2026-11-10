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
      className={cn(
        'space-y-4',
        band &&
          '-mx-4 -mt-8 border-b bg-muted/60 px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 lg:py-10',
      )}
    >
      {breadcrumb && (
        <Breadcrumb aria-label="Vị trí trang">
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
      <h1 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
      <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
      {children && <div className={cn(band && 'max-w-xl')}>{children}</div>}
    </header>
  );
}
