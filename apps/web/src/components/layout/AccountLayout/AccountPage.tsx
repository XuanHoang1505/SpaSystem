import { Fragment, useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDownIcon, SlidersHorizontalIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AccountPageProps {
  title: string;
  description?: ReactNode;
  breadcrumbs: readonly { label: string; to?: string }[];
  actions?: ReactNode;
  toolbar?: ReactNode;
  filters?: ReactNode;
  activeFilterCount?: number;
  children: ReactNode;
}

/** Compact account shell: all header spacing and responsive filter disclosure live here. */
export function AccountPage({
  title,
  description,
  breadcrumbs,
  actions,
  toolbar,
  filters,
  activeFilterCount = 0,
  children,
}: AccountPageProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();

  return (
    <section
      data-slot="account-page"
      className="min-w-0 space-y-4 rounded-2xl border bg-card p-4 shadow-xs sm:p-6"
    >
      <div className="space-y-2 border-b border-border pb-4">
        <Breadcrumb aria-label="Vị trí trang">
          <BreadcrumbList className="text-xs">
            {breadcrumbs.map((step, index) => (
              <Fragment key={`${step.label}-${index}`}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {step.to && index < breadcrumbs.length - 1 ? (
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
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      </div>
      {toolbar && <div className="min-w-0">{toolbar}</div>}
      {filters && (
        <div className="min-w-0 rounded-xl border bg-muted/20 p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between sm:hidden"
            aria-expanded={filtersOpen}
            aria-controls={filtersId}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontalIcon className="size-4" aria-hidden="true" />
              Bộ lọc{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </span>
            <ChevronDownIcon
              className={cn('size-4 transition-transform', filtersOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </Button>
          <div id={filtersId} className={cn('pt-3 sm:pt-0', !filtersOpen && 'hidden sm:block')}>
            {filters}
          </div>
        </div>
      )}
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}
