import { useState } from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import { errorCodeOf, workScheduleErrorCodes } from '@spa/api-client';
import type { WorkScheduleItem } from '@spa/shared-types';
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
import { formatLocalDate } from '@/lib/formatting/formatters';
import { useCancelShift } from '../hooks/useWorkScheduleMutations';

export interface CancelShiftDialogProps {
  shift: WorkScheduleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CancelShiftDialog({
  shift,
  open,
  onOpenChange,
  onSuccess,
}: CancelShiftDialogProps) {
  const cancelMutation = useCancelShift();
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!shift) return;
    setError(null);

    try {
      await cancelMutation.mutateAsync({
        id: shift.id,
        body: { status: 'cancelled' },
      });

      toast.success(
        `Ca làm ngày ${formatLocalDate(shift.date)} của ${shift.staffName} đã được hủy.`,
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === workScheduleErrorCodes.SHIFT_HAS_APPOINTMENTS) {
        setError(
          'Ca này đang có lịch hẹn đã phân công. Hãy đổi hoặc gán lại lịch hẹn trước khi hủy ca.',
        );
      } else if (code === workScheduleErrorCodes.SHIFT_IN_PAST) {
        setError('Không thể hủy ca của ngày đã qua.');
      } else {
        setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi hủy ca làm việc.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="size-5" />
            Hủy ca làm việc
          </DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn hủy ca làm việc này không? Ca đã hủy không thể mở lại.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {shift && (
          <div className="space-y-1.5 rounded-xl border bg-card/60 p-3.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nhân viên:</span>
              <span className="font-semibold text-foreground">{shift.staffName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ngày:</span>
              <span className="font-medium text-foreground">{formatLocalDate(shift.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Khung giờ:</span>
              <span className="font-medium text-foreground">
                {shift.startTime} – {shift.endTime}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelMutation.isPending}
          >
            Đóng
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? 'Đang hủy...' : 'Xác nhận hủy ca'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
