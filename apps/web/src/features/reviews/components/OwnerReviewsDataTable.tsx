import { useMemo } from 'react';
import {
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  MessageSquareIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react';
import type { OwnerReview } from '@spa/shared-types';
import {
  DataTable,
  type DataTableColumn,
  type DataTablePage,
  type DataTableRowAction,
} from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { initialOf } from '@/features/auth/components/AccountMenu';
import {
  formatReviewDate,
  formatReviewDateTime,
  reviewStatusBadge,
} from '../utils/reviewHelpers';

export interface OwnerReviewsDataTableProps {
  data: readonly OwnerReview[] | undefined;
  page?: DataTablePage;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];
  hasFilters?: boolean;
  onResetFilters?: () => void;
  onSelectReview: (review: OwnerReview) => void;
  onReply: (review: OwnerReview) => void;
  onDeleteReply: (review: OwnerReview) => void;
  onToggleVisibility: (review: OwnerReview) => void;
  onImageClick: (url: string) => void;
}

export function OwnerReviewsDataTable({
  data,
  page,
  isLoading,
  isFetching,
  error,
  onRetry,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  hasFilters,
  onResetFilters,
  onSelectReview,
  onReply,
  onDeleteReply,
  onToggleVisibility,
  onImageClick,
}: OwnerReviewsDataTableProps) {
  const columns = useMemo<readonly DataTableColumn<OwnerReview>[]>(
    () => [
      {
        id: 'customer',
        header: 'Khách hàng',
        className: 'min-w-[180px]',
        cell: (row) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-8 border">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initialOf(row.customer.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground text-sm">
                {row.customer.fullName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {row.customer.phoneNumber || row.customer.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: 'product',
        header: 'Dịch vụ / Gói',
        className: 'min-w-[160px]',
        cell: (row) => {
          const isPackage = row.productType === 'package';
          return (
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className="w-fit text-[11px] font-normal">
                {isPackage ? 'Gói dịch vụ' : 'Dịch vụ lẻ'}
              </Badge>
              <span className="font-medium text-sm text-foreground line-clamp-2">
                {row.productName}
              </span>
            </div>
          );
        },
      },
      {
        id: 'review',
        header: 'Đánh giá & Nhận xét',
        className: 'min-w-[240px]',
        cell: (row) => (
          <div className="space-y-1.5 py-1">
            <div
              className="flex items-center gap-0.5"
              aria-label={`${row.rating} trên 5 sao`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`size-3.5 ${
                    star <= row.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/25'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>

            {row.comment && (
              <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed">
                {row.comment}
              </p>
            )}

            {row.imageUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageClick(row.imageUrl!);
                }}
                className="group relative mt-1 flex items-center gap-1.5 overflow-hidden rounded-md border border-border/80 px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground"
                aria-label="Xem ảnh khách chụp"
              >
                <ImageIcon className="size-3 text-primary" aria-hidden="true" />
                <span>Xem ảnh đính kèm</span>
              </button>
            )}
          </div>
        ),
      },
      {
        id: 'reply',
        header: 'Phản hồi từ Spa',
        hideBelow: 'md',
        className: 'min-w-[200px]',
        cell: (row) =>
          row.ownerReply ? (
            <div className="space-y-1 py-1">
              <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed italic">
                "{row.ownerReply}"
              </p>
              {row.repliedAtUtc && (
                <p className="text-[11px] text-muted-foreground">
                  {formatReviewDate(row.repliedAtUtc)}
                </p>
              )}
            </div>
          ) : (
            <span className="text-xs italic text-muted-foreground">Chưa phản hồi</span>
          ),
      },
      {
        id: 'createdAt',
        header: 'Ngày gửi',
        hideBelow: 'lg',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatReviewDateTime(row.createdAtUtc)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: (row) => {
          const badge = reviewStatusBadge(row.status);
          const isVisible = row.status === 'visible';
          return (
            <Badge
              variant="outline"
              className={`text-xs ${
                isVisible
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {badge.label}
            </Badge>
          );
        },
      },
    ],
    [onImageClick],
  );

  const rowActions = (row: OwnerReview): DataTableRowAction<OwnerReview>[] => {
    const actions: DataTableRowAction<OwnerReview>[] = [
      {
        label: 'Xem chi tiết',
        icon: EyeIcon,
        onSelect: () => onSelectReview(row),
      },
      {
        label: row.ownerReply ? 'Sửa phản hồi' : 'Phản hồi',
        icon: MessageSquareIcon,
        onSelect: () => onReply(row),
      },
    ];

    if (row.ownerReply) {
      actions.push({
        label: 'Xóa phản hồi',
        icon: Trash2Icon,
        variant: 'destructive',
        onSelect: () => onDeleteReply(row),
      });
    }

    actions.push({
      label: row.status === 'visible' ? 'Ẩn đánh giá' : 'Hiện đánh giá',
      icon: row.status === 'visible' ? EyeOffIcon : EyeIcon,
      onSelect: () => onToggleVisibility(row),
    });

    return actions;
  };

  const empty = (
    <EmptyState
      icon={SparklesIcon}
      title={hasFilters ? 'Không tìm thấy đánh giá nào' : 'Chưa có đánh giá nào'}
      description={
        hasFilters
          ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
          : 'Hệ thống chưa ghi nhận đánh giá nào từ khách hàng.'
      }
      action={
        hasFilters && onResetFilters ? (
          <Button variant="outline" size="sm" onClick={onResetFilters}>
            Đặt lại bộ lọc
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      caption="Danh sách đánh giá từ khách hàng"
      isLoading={isLoading}
      isFetching={isFetching}
      error={error}
      onRetry={onRetry}
      page={page}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
      onRowClick={onSelectReview}
      rowActions={rowActions}
      empty={empty}
    />
  );
}
