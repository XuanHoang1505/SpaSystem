import {
  CalendarIcon,
  ClockIcon,
  ImageIcon,
  PackageIcon,
  PencilIcon,
  PowerIcon,
} from 'lucide-react';
import type { PackageDetail } from '@spa/shared-types';
import { EmptyState } from '@/components/shared/EmptyState/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { catalogStatusBadge } from '@/features/services';
import {
  formatCurrency,
  formatDateTimeUtc,
  formatLocalDate,
} from '@/lib/formatting/formatters';
import { savingPercent } from '../../coursePlan';
import { usePackage } from '../../hooks/usePackage';

export interface PackageDetailSheetProps {
  packageId: string | null;
  onClose: () => void;
  onEdit: (pkg: PackageDetail) => void;
  onChangeImage: (pkg: PackageDetail) => void;
  onToggleStatus: (pkg: PackageDetail) => void;
}

export function PackageDetailSheet({
  packageId,
  onClose,
  onEdit,
  onChangeImage,
  onToggleStatus,
}: PackageDetailSheetProps) {
  const query = usePackage(packageId ?? '', Boolean(packageId));
  const detail = query.data;

  const discount = detail ? savingPercent(detail.price, detail.retailPrice) : 0;
  const hasDiscount = Boolean(detail && detail.retailPrice > detail.price);

  let salePeriodText = 'Không giới hạn';
  if (detail?.saleStartDate && detail?.saleEndDate) {
    salePeriodText = `${formatLocalDate(detail.saleStartDate)} - ${formatLocalDate(detail.saleEndDate)}`;
  } else if (detail?.saleStartDate) {
    salePeriodText = `Từ ${formatLocalDate(detail.saleStartDate)}`;
  } else if (detail?.saleEndDate) {
    salePeriodText = `Đến ${formatLocalDate(detail.saleEndDate)}`;
  }

  return (
    <Sheet open={Boolean(packageId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b p-5">
          <SheetTitle>Chi tiết gói dịch vụ</SheetTitle>
          <SheetDescription>
            Thông tin thời hạn, số buổi và quy trình dịch vụ thành phần của gói
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {query.isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Không tải được chi tiết"
              message="Đã xảy ra lỗi khi tải thông tin gói dịch vụ."
              onRetry={() => query.refetch()}
            />
          )}

          {!query.isLoading && !query.isError && !detail && (
            <EmptyState
              title="Không tìm thấy gói dịch vụ"
              description="Gói dịch vụ này không tồn tại hoặc đã bị xóa."
            />
          )}

          {detail && (
            <>
              {/* Media image banner */}
              <div className="overflow-hidden rounded-xl border bg-muted/30">
                {detail.imageUrl ? (
                  <img
                    src={detail.imageUrl}
                    alt={detail.name}
                    className="max-h-64 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <PackageIcon className="size-10 stroke-1 opacity-60" />
                    <span className="text-xs">Chưa có ảnh riêng (hiển thị ảnh dịch vụ thành phần)</span>
                  </div>
                )}
              </div>

              {/* Title & Status */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-heading text-xl font-bold text-foreground">
                    {detail.name}
                  </h3>
                  <StatusBadge
                    label={catalogStatusBadge[detail.status].label}
                    tone={catalogStatusBadge[detail.status].tone}
                    status={detail.status}
                  />
                </div>
                {detail.shortDescription && (
                  <p className="text-sm text-muted-foreground">
                    {detail.shortDescription}
                  </p>
                )}
              </div>

              <Separator />

              {/* Pricing & Duration stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border bg-card/60 p-3.5">
                  <span className="text-xs text-muted-foreground">Giá gói</span>
                  <div className="mt-1 font-heading text-base font-bold text-foreground sm:text-lg">
                    {formatCurrency(detail.price)}
                  </div>
                  {hasDiscount && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(detail.retailPrice)}
                      </span>
                      {discount > 0 && (
                        <span className="rounded-sm bg-primary/10 px-1 py-0.2 text-[10px] font-semibold text-primary">
                          -{discount}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border bg-card/60 p-3.5">
                  <span className="text-xs text-muted-foreground">Tổng số buổi</span>
                  <div className="mt-1 font-heading text-base font-bold text-foreground sm:text-lg">
                    {detail.totalSessions} buổi
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {detail.items.length} loại dịch vụ
                  </span>
                </div>

                <div className="rounded-xl border bg-card/60 p-3.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClockIcon className="size-3" />
                    <span>Thời hạn</span>
                  </div>
                  <div className="mt-1 font-heading text-base font-bold text-foreground sm:text-lg">
                    {detail.validityDays} ngày
                  </div>
                  <span className="text-[11px] text-muted-foreground">tính từ kích hoạt</span>
                </div>

                <div className="rounded-xl border bg-card/60 p-3.5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarIcon className="size-3" />
                    <span>Mở bán</span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-foreground">
                    {salePeriodText}
                  </div>
                </div>
              </div>

              {/* Long description */}
              {detail.description && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Mô tả chi tiết
                  </h4>
                  <div className="rounded-xl border bg-card/60 p-3.5 text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {detail.description}
                  </div>
                </div>
              )}

              {/* Items Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Trình tự các buổi dịch vụ ({detail.items.length} dịch vụ)
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Tổng cộng: {detail.totalSessions} buổi
                  </span>
                </div>

                {detail.items.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground italic">
                    Chưa cấu hình dịch vụ thành phần cho gói này.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {detail.items.map((item, idx) => {
                      const isDiscontinued = item.serviceStatus === 'discontinued';
                      const itemTotal = item.servicePrice * item.sessionCount;

                      return (
                        <div
                          key={item.spaServiceId || idx}
                          className="relative flex flex-col gap-2 rounded-xl border bg-card/60 p-3.5 text-sm sm:flex-row sm:items-start sm:gap-3"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {item.sortOrder || idx + 1}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {item.serviceName}
                                </span>
                                {isDiscontinued && (
                                  <StatusBadge
                                    label="Dịch vụ ngừng bán"
                                    tone="neutral"
                                    status="discontinued"
                                  />
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(itemTotal)}
                                </span>
                                <span className="block text-[11px] text-muted-foreground">
                                  {formatCurrency(item.servicePrice)} × {item.sessionCount} buổi
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                Số buổi: <strong className="text-foreground">{item.sessionCount}</strong>
                              </span>
                              <span>
                                Khoảng cách:{' '}
                                <strong className="text-foreground">
                                  {item.minDaysBetweenSessions > 0
                                    ? `Cách buổi trước ít nhất ${item.minDaysBetweenSessions} ngày`
                                    : 'Không yêu cầu khoảng cách'}
                                </strong>
                              </span>
                            </div>

                            {item.note && (
                              <p className="rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground whitespace-pre-line">
                                <strong className="font-medium text-foreground">Ghi chú: </strong>
                                {item.note}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Audit Timestamps */}
              <div className="space-y-1 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                <div>Tạo lúc: {formatDateTimeUtc(detail.createdAtUtc)}</div>
                {detail.updatedAtUtc && (
                  <div>Cập nhật: {formatDateTimeUtc(detail.updatedAtUtc)}</div>
                )}
              </div>
            </>
          )}
        </div>

        {detail && (
          <SheetFooter className="flex flex-row flex-wrap justify-end gap-2 border-t p-4 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(detail)}
              className="gap-1.5"
            >
              <PencilIcon className="size-3.5" />
              Sửa gói
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChangeImage(detail)}
              className="gap-1.5"
            >
              <ImageIcon className="size-3.5" />
              Đổi ảnh
            </Button>
            <Button
              variant={detail.status === 'on_sale' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => onToggleStatus(detail)}
              className="gap-1.5"
            >
              <PowerIcon className="size-3.5" />
              {detail.status === 'on_sale' ? 'Ngừng bán' : 'Mở bán'}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
