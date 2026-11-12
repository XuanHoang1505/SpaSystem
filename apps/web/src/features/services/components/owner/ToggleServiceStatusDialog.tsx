import { useState } from 'react';
import { AlertTriangleIcon, PowerIcon } from 'lucide-react';
import { ApiClientError } from '@spa/api-client';
import type { CatalogStatus, ServiceDetail, ServiceListItem } from '@spa/shared-types';
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
import { toast } from 'sonner';
import { useChangeServiceStatus } from '../../hooks/useServiceMutations';

export interface ToggleServiceStatusDialogProps {
  service: ServiceListItem | ServiceDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ToggleServiceStatusDialog({
  service,
  open,
  onOpenChange,
  onSuccess,
}: ToggleServiceStatusDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const changeStatusMutation = useChangeServiceStatus();

  if (!service) return null;

  const isDiscontinuing = service.status === 'on_sale';
  const nextStatus: CatalogStatus = isDiscontinuing ? 'discontinued' : 'on_sale';

  const handleToggle = async () => {
    setErrorMessage(null);

    try {
      await changeStatusMutation.mutateAsync({
        id: service.id,
        body: { status: nextStatus },
      });

      toast.success(
        isDiscontinuing
          ? `Đã ngừng bán dịch vụ "${service.name}".`
          : `Đã mở bán lại dịch vụ "${service.name}".`,
      );

      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Đã xảy ra lỗi khi cập nhật trạng thái dịch vụ.');
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
            {isDiscontinuing ? (
              <>
                <AlertTriangleIcon className="size-5 text-destructive" />
                <span className="text-destructive">Ngừng bán dịch vụ</span>
              </>
            ) : (
              <>
                <PowerIcon className="size-5 text-primary" />
                <span>Mở bán lại dịch vụ</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isDiscontinuing ? (
              <>
                Bạn có chắc chắn muốn ngừng bán dịch vụ{' '}
                <strong className="text-foreground">{service.name}</strong>? Dịch vụ này sẽ không
                còn hiển thị trên trang tìm kiếm và đặt lịch của khách hàng.
              </>
            ) : (
              <>
                Bạn có chắc chắn muốn mở bán lại dịch vụ{' '}
                <strong className="text-foreground">{service.name}</strong>? Dịch vụ này sẽ hiển thị
                công khai trở lại để khách hàng tìm kiếm và đặt lịch.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {isDiscontinuing && (
          <div className="space-y-1 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-destructive">Lưu ý:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>Các lịch hẹn đã đặt trước đó vẫn được thực hiện bình thường.</li>
              <li>Các gói dịch vụ đã mua có chứa dịch vụ này vẫn có thể kích hoạt sử dụng.</li>
            </ul>
          </div>
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
            variant={isDiscontinuing ? 'destructive' : 'default'}
            onClick={handleToggle}
            disabled={changeStatusMutation.isPending}
          >
            {changeStatusMutation.isPending
              ? 'Đang xử lý...'
              : isDiscontinuing
                ? 'Xác nhận ngừng bán'
                : 'Xác nhận mở bán'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
