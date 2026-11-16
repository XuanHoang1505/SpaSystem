import { BellOffIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { NumberedPager } from '@/components/shared/NumberedPager/NumberedPager';
import { NotificationCard } from './NotificationCard';
import type { NotificationDto } from '@spa/shared-types';

interface NotificationFeedProps {
  items: readonly NotificationDto[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  pageNumber: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemClick: (item: NotificationDto) => void;
  onMarkRead: (id: string) => void;
  isMarkingRead?: boolean;
  unreadOnly?: boolean;
}

export function NotificationFeed({
  items,
  isLoading,
  isError,
  onRetry,
  pageNumber,
  totalPages,
  onPageChange,
  onItemClick,
  onMarkRead,
  isMarkingRead,
  unreadOnly,
}: NotificationFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-card"
          >
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="flex gap-2 items-center">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <ErrorState
          title="Không thể tải danh sách thông báo"
          message="Đã xảy ra lỗi khi kết nối máy chủ. Vui lòng thử lại."
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6">
        <EmptyState
          icon={BellOffIcon}
          title={unreadOnly ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
          description={
            unreadOnly
              ? 'Tuyệt vời! Bạn đã đọc hết tất cả các thông báo.'
              : 'Các thông báo về lịch hẹn, liệu trình và tài khoản sẽ xuất hiện tại đây.'
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item) => (
          <NotificationCard
            key={item.id}
            item={item}
            onItemClick={onItemClick}
            onMarkRead={onMarkRead}
            isMarkingRead={isMarkingRead}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pt-2 flex justify-center">
          <NumberedPager
            pageNumber={pageNumber}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
