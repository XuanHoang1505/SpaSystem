import { ClockIcon, ImageIcon, PencilIcon, PowerIcon, SparklesIcon, TagIcon } from 'lucide-react';
import type { ServiceDetail } from '@spa/shared-types';
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
import { formatCurrency, formatDateTimeUtc, formatDuration } from '@/lib/formatting/formatters';
import { catalogStatusBadge } from '../../catalogStatus';
import { useService } from '../../hooks/useService';

export interface ServiceDetailSheetProps {
  serviceId: string | null;
  onClose: () => void;
  onEdit: (service: ServiceDetail) => void;
  onChangeImage: (service: ServiceDetail) => void;
  onToggleStatus: (service: ServiceDetail) => void;
}

export function ServiceDetailSheet({
  serviceId,
  onClose,
  onEdit,
  onChangeImage,
  onToggleStatus,
}: ServiceDetailSheetProps) {
  const query = useService(serviceId ?? '', Boolean(serviceId));
  const detail = query.data;

  return (
    <Sheet open={Boolean(serviceId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b p-5">
          <SheetTitle>Chi tiết dịch vụ</SheetTitle>
          <SheetDescription>Thông tin chi tiết quy trình, giá và thời lượng dịch vụ</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {query.isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          )}

          {query.isError && (
            <ErrorState
              title="Không tải được chi tiết"
              message="Đã xảy ra lỗi khi tải thông tin dịch vụ."
              onRetry={() => query.refetch()}
            />
          )}

          {!query.isLoading && !query.isError && !detail && (
            <EmptyState
              title="Không tìm thấy dịch vụ"
              description="Dịch vụ này không tồn tại hoặc đã bị xóa."
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
                    className="max-h-60 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <SparklesIcon className="size-8 opacity-60" />
                    <span className="text-xs">Chưa có ảnh đại diện</span>
                  </div>
                )}
              </div>

              {/* Title & Category & Status */}
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
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TagIcon className="size-3.5" />
                  <span>Danh mục: <strong className="text-foreground">{detail.category}</strong></span>
                </div>
                {detail.shortDescription && (
                  <p className="text-sm text-muted-foreground">
                    {detail.shortDescription}
                  </p>
                )}
              </div>

              <Separator />

              {/* Pricing & Duration stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-card/60 p-3.5">
                  <span className="text-xs text-muted-foreground">Giá niêm yết</span>
                  <div className="mt-1 font-heading text-lg font-bold text-foreground">
                    {formatCurrency(detail.price)}
                  </div>
                </div>
                <div className="rounded-xl border bg-card/60 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ClockIcon className="size-3.5" />
                    <span>Thời lượng</span>
                  </div>
                  <div className="mt-1 font-heading text-lg font-bold text-foreground">
                    {formatDuration(detail.durationMinutes)}
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

              {/* Procedure Steps */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Quy trình thực hiện ({detail.steps.length} bước)
                </h4>
                {detail.steps.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground italic">
                    Chưa cấu hình các bước quy trình cho dịch vụ này.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {detail.steps.map((step, idx) => (
                      <div
                        key={step.sortOrder ?? idx}
                        className="relative flex gap-3 rounded-xl border bg-card/60 p-3.5 text-sm"
                      >
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {step.sortOrder || idx + 1}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground">{step.title}</span>
                            {step.durationMinutes && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(step.durationMinutes)}
                              </span>
                            )}
                          </div>
                          {step.description && (
                            <p className="text-xs text-muted-foreground whitespace-pre-line">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
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
              Sửa thông tin
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
              {detail.status === 'on_sale' ? 'Ngừng bán' : 'Mở bán lại'}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
