import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import { SearchXIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { isNotFound } from '../catalogErrors';
import { CatalogErrorState } from './CatalogErrorState';

/** Trạng thái tải/không tìm thấy/lỗi của trang chi tiết dịch vụ hoặc gói; có dữ liệu thì render `children`. */
export function CatalogDetailStates({
  query,
  notFoundTitle,
  notFoundDescription,
  backTo,
  backLabel,
  children,
}: {
  query: UseQueryResult<unknown>;
  notFoundTitle: string;
  notFoundDescription: string;
  backTo: string;
  backLabel: string;
  children: ReactNode;
}) {
  if (query.isPending)
    return (
      <div className="grid gap-8 lg:grid-cols-2" aria-label="Đang tải" aria-busy="true">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-10 w-3/4" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  if (query.isError && isNotFound(query.error))
    return (
      <EmptyState
        icon={SearchXIcon}
        title={notFoundTitle}
        description={notFoundDescription}
        action={
          <Button asChild>
            <Link to={backTo}>{backLabel}</Link>
          </Button>
        }
      />
    );
  if (query.isError)
    return (
      <CatalogErrorState
        error={query.error}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      />
    );
  return <>{children}</>;
}
