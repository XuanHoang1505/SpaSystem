import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/** "Dịch vụ / {tên}" hoặc "Gói dịch vụ / {tên}" trên trang chi tiết. */
export function CatalogBreadcrumb({
  parentLabel,
  parentTo,
  current,
}: {
  parentLabel: string;
  parentTo: string;
  current: string;
}) {
  return (
    <Breadcrumb aria-label="Vị trí trang">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={parentTo}>{parentLabel}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate">{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
