import { useState } from 'react';
import { AlertTriangleIcon, PowerIcon } from 'lucide-react';
import { ApiClientError } from '@spa/api-client';
import type { CatalogStatus, PackageDetail, PackageListItem } from '@spa/shared-types';
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
import { useChangePackageStatus } from '../../hooks/usePackageMutations';

export interface TogglePackageStatusDialogProps {
  pkg: PackageListItem | PackageDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TogglePackageStatusDialog({
  pkg,
  open,
  onOpenChange,
  onSuccess,
}: TogglePackageStatusDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const changeStatusMutation = useChangePackageStatus();

  if (!pkg) return null;

  const isDiscontinuing = pkg.status === 'on_sale';
  const nextStatus: CatalogStatus = isDiscontinuing ? 'discontinued' : 'on_sale';

  const handleToggle = async () => {
    setErrorMessage(null);

    try {
      await changeStatusMutation.mutateAsync({
        id: pkg.id,
        body: { status: nextStatus },
      });

      toast.success(
        isDiscontinuing
          ? `Đã ngừng bán gói dịch vụ "${pkg.name}".`
          : `Đã mở bán lại gói dịch vụ "${pkg.name}".`,
      );

      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Đã xảy ra lỗi khi cập nhật trạng thái gói dịch vụ.');
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
                <span className="text-destructive">Ngừng bán gói dịch vụ</span>
              </>
            ) : (
              <>
                <PowerIcon className="size-5 text-primary" />
                <span>Mở bán lại gói dịch vụ</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isDiscontinuing ? (
              <>
                Bạn có chắc chắn muốn ngừng bán gói dịch vụ{' '}
                <strong className="text-foreground">{pkg.name}</strong>? Gói này sẽ không còn hiển
                thị trên trang danh mục để khách hàng mua mới.
              </>
            ) : (
              <>
                Bạn có chắc chắn muốn mở bán lại gói dịch vụ{' '}
                <strong className="text-foreground">{pkg.name}</strong>? Gói này sẽ hiển thị công khai
                trở lại để khách hàng tham khảo và mua hàng.
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
            <p className="font-semibold text-destructive">Lưu ý quan trọng:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              <li>Khách hàng đã mua gói này trước đó vẫn được sử dụng các buổi còn lại theo thời hạn hiệu lực.</li>
              <li>Các lịch hẹn đã đặt sử dụng gói này vẫn diễn ra bình thường.</li>
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
