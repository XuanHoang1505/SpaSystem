import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/** "Trang chủ / Giỏ hàng" style trail above the title; the last entry is the current page. */
export function OrdersBreadcrumb({ trail }: { trail: readonly { label: string; to?: string }[] }) {
  return (
    <Breadcrumb aria-label="Vị trí trang" className="pb-2">
      <BreadcrumbList>
        {trail.map((step, index) => (
          <Fragment key={`${step.label}-${index}`}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {step.to && index < trail.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link to={step.to}>{step.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{step.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
