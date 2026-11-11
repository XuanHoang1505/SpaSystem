import { AlertTriangleIcon, CalendarIcon, CopyIcon, PencilIcon, PowerIcon, TagIcon, UsersIcon } from 'lucide-react';
import type { PromotionDto } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { toast } from 'sonner';
import {
  formatPromotionDiscount,
  isPromotionExpired,
  promotionStatusBadge,
} from '../../promotionStatus';
import { usePromotion } from '../../hooks/usePromotions';

function formatPromotionDate(utcString: string): string {
  try {
    return formatLocalDate(vietnamDateOf(utcString));
  } catch {
    return formatLocalDate(utcString);
  }
}

export interface PromotionDetailSheetProps {
  promotionId: string | null;
  onClose: () => void;
  onEdit: (promotion: PromotionDto) => void;
  onToggleStatus: (promotion: PromotionDto) => void;
}

export function PromotionDetailSheet({
  promotionId,
  onClose,
  onEdit,
  onToggleStatus,
}: PromotionDetailSheetProps) {
  const query = usePromotion(promotionId ?? '', Boolean(promotionId));
  const detail = query.data;

  const isExpired = detail ? isPromotionExpired(detail.endsAtUtc) : false;

  return (
    <Sheet open={Boolean(promotionId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-5">
          <SheetTitle>Chi tiết khuyến mãi</SheetTitle>
          <SheetDescription>Thông tin thiết lập và tình hình sử dụng mã khuyến mãi</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {query.isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-14 w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Không tải được chi tiết"
              message="Đã xảy ra lỗi khi tải thông tin khuyến mãi."
              onRetry={() => query.refetch()}
            />
          )}

          {!query.isLoading && !query.isError && !detail && (
            <EmptyState
              title="Không tìm thấy khuyến mãi"
              description="Chương trình khuyến mãi này không tồn tại hoặc đã bị xóa."
            />
          )}

          {detail && (
            <>
              {/* Header card with code & status */}
              <div className="rounded-xl border bg-card p-4 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xl font-bold tracking-wider text-primary">
                        {detail.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(detail.code);
                          toast.success(`Đã sao chép mã "${detail.code}".`);
                        }}
                        className="rounded-md p-1 text-muted-foreground opacity-70 transition hover:bg-muted hover:text-foreground hover:opacity-100 focus:outline-none"
                        title="Sao chép mã"
                        aria-label={`Sao chép mã ${detail.code}`}
                      >
                        <CopyIcon className="size-4" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {formatPromotionDiscount(
                        detail.discountType,
                        detail.discountValue,
                        detail.maxDiscountAmount,
                      )}
                    </p>
                  </div>
                  <StatusBadge
                    label={promotionStatusBadge[detail.status].label}
                    tone={promotionStatusBadge[detail.status].tone}
                    status={detail.status}
                  />
                </div>

                {detail.description && (
                  <p className="mt-3 border-t pt-3 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                    {detail.description}
                  </p>
                )}
              </div>

              {/* Expired warning if applicable */}
              {isExpired && (
                <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
                  <AlertTriangleIcon className="size-4 text-destructive" />
                  <AlertDescription className="text-xs text-destructive">
                    Chương trình khuyến mãi này đã hết hạn áp dụng. Bạn có thể gia hạn ngày kết thúc
                    để tiếp tục sử dụng.
                  </AlertDescription>
                </Alert>
              )}

              {/* Usage stats tile */}
              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <UsersIcon className="size-3.5" />
                  <span>Tình hình sử dụng</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-card/60 p-3">
                    <span className="text-xs text-muted-foreground">Đã sử dụng</span>
                    <div className="mt-1 font-heading text-lg font-bold text-foreground">
                      {detail.usedCount}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">lượt</span>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card/60 p-3">
                    <span className="text-xs text-muted-foreground">Tổng giới hạn lượt</span>
                    <div className="mt-1 font-heading text-lg font-bold text-foreground">
                      {detail.usageLimit != null ? (
                        <>
                          {detail.usageLimit}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            lượt
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-foreground">Không giới hạn</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditions tile */}
              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <TagIcon className="size-3.5" />
                  <span>Điều kiện áp dụng</span>
                </h4>
                <div className="space-y-2.5 rounded-xl border bg-card/60 p-3.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Đơn tối thiểu</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(detail.minOrderAmount)}
                    </span>
                  </div>

                  {detail.discountType === 'percentage' && (
                    <div className="flex items-center justify-between gap-2 border-t pt-2">
                      <span className="text-xs text-muted-foreground">Mức giảm tối đa</span>
                      <span className="font-medium text-foreground">
                        {detail.maxDiscountAmount != null
                          ? formatCurrency(detail.maxDiscountAmount)
                          : 'Không giới hạn'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <span className="text-xs text-muted-foreground">Giới hạn mỗi khách</span>
                    <span className="font-medium text-foreground">
                      {detail.perCustomerLimit != null
                        ? `${detail.perCustomerLimit} lần`
                        : 'Không giới hạn'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Validity period tile */}
              <div className="space-y-2">
                <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <CalendarIcon className="size-3.5" />
                  <span>Thời gian hiệu lực</span>
                </h4>
                <div className="space-y-2 rounded-xl border bg-card/60 p-3.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Ngày bắt đầu</span>
                    <span className="font-medium text-foreground">
                      {formatPromotionDate(detail.startsAtUtc)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <span className="text-xs text-muted-foreground">Ngày kết thúc</span>
                    <span className="font-medium text-foreground">
                      {formatPromotionDate(detail.endsAtUtc)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {detail && (
          <SheetFooter className="border-t p-4 sm:justify-between sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(detail)}
              className="gap-1.5"
            >
              <PencilIcon className="size-3.5" />
              <span>Sửa thông tin</span>
            </Button>

            <Button
              type="button"
              variant={detail.status === 'active' ? 'destructive' : 'default'}
              size="sm"
              onClick={() => onToggleStatus(detail)}
              className="gap-1.5"
            >
              <PowerIcon className="size-3.5" />
              <span>{detail.status === 'active' ? 'Tạm dừng mã' : 'Kích hoạt lại'}</span>
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
