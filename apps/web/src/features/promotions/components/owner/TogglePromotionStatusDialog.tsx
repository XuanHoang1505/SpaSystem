import { useState } from 'react';
import { AlertTriangleIcon, PowerIcon } from 'lucide-react';
import { ApiClientError } from '@spa/api-client';
import type { PromotionDto, PromotionStatus } from '@spa/shared-types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatLocalDate } from '@/lib/formatting/formatters';
import { vietnamDateOf } from '@/lib/formatting/vietnamTime';
import { toast } from 'sonner';
import { useChangePromotionStatus } from '../../hooks/usePromotionMutations';
import { isPromotionExpired } from '../../promotionStatus';

function formatPromotionDate(utcString: string): string {
  try {
    return formatLocalDate(vietnamDateOf(utcString));
  } catch {
    return formatLocalDate(utcString);
  }
}

export interface TogglePromotionStatusDialogProps {
  promotion: PromotionDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TogglePromotionStatusDialog({
  promotion,
  open,
  onOpenChange,
  onSuccess,
}: TogglePromotionStatusDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const changeStatusMutation = useChangePromotionStatus();

  if (!promotion) return null;

  const isStopping = promotion.status === 'active';
  const nextStatus: PromotionStatus = isStopping ? 'stopped' : 'active';
  const isExpired = isPromotionExpired(promotion.endsAtUtc);

  const handleToggle = async () => {
    setErrorMessage(null);

    try {
      await changeStatusMutation.mutateAsync({
        id: promotion.id,
        body: { status: nextStatus },
      });

      toast.success(
        isStopping
          ? `Đã tạm dừng chương trình khuyến mãi "${promotion.code}".`
          : `Đã kích hoạt lại chương trình khuyến mãi "${promotion.code}".`,
      );

      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Đã xảy ra lỗi khi cập nhật trạng thái khuyến mãi.');
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setErrorMessage(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isStopping ? (
              <>
                <AlertTriangleIcon className="size-5 text-destructive" />
                <span className="text-destructive">Tạm dừng khuyến mãi</span>
              </>
            ) : (
              <>
                <PowerIcon className="size-5 text-primary" />
                <span>Kích hoạt lại khuyến mãi</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isStopping ? (
              <>
                Bạn có chắc chắn muốn tạm dừng chương trình khuyến mãi{' '}
                <strong className="font-mono text-foreground">{promotion.code}</strong>? Mã này sẽ
                không còn áp dụng được cho các đơn hàng mới.
              </>
            ) : (
              <>
                Bạn có chắc chắn muốn kích hoạt lại chương trình khuyến mãi{' '}
                <strong className="font-mono text-foreground">{promotion.code}</strong>? Khách hàng
                sẽ có thể áp dụng mã này khi đặt lịch và thanh toán dịch vụ.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {isStopping && (
          <div className="space-y-1 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-destructive">Lưu ý quan trọng:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>Mã sẽ không thể áp dụng cho bất kỳ lượt đặt lịch hoặc thanh toán mới nào.</li>
              <li>
                Các đơn hàng đang trong quá trình thanh toán đã giữ mã vẫn được bảo lưu theo thời
                hạn thanh toán.
              </li>
            </ul>
          </div>
        )}

        {!isStopping && isExpired && (
          <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs">
              Chương trình khuyến mãi này đã quá hạn kết thúc (
              {formatPromotionDate(promotion.endsAtUtc)}). Bạn nên gia hạn ngày kết thúc trong phần
              sửa thông tin để khách hàng có thể áp dụng mã.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={changeStatusMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant={isStopping ? 'destructive' : 'default'}
            onClick={handleToggle}
            disabled={changeStatusMutation.isPending}
          >
            {changeStatusMutation.isPending
              ? 'Đang xử lý...'
              : isStopping
                ? 'Xác nhận tạm dừng'
                : 'Xác nhận kích hoạt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
