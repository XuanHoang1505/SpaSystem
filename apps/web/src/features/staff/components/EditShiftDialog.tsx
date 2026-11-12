import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useUpdateShift } from '../hooks/useWorkScheduleMutations';
import { updateShiftSchema, type UpdateShiftFormValues } from '../schemas';

export interface EditShiftDialogProps {
  shift: WorkScheduleItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditShiftDialog({ shift, open, onOpenChange, onSuccess }: EditShiftDialogProps) {
  const updateMutation = useUpdateShift();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateShiftFormValues>({
    resolver: zodResolver(updateShiftSchema),
    defaultValues: {
      date: '',
      startTime: '',
      endTime: '',
    },
  });

  useEffect(() => {
    if (shift && open) {
      reset({
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
      });
      setError(null);
    }
  }, [shift, open, reset]);

  const onSubmit = async (values: UpdateShiftFormValues) => {
    if (!shift) return;
    setError(null);

    try {
      await updateMutation.mutateAsync({
        id: shift.id,
        body: {
          date: values.date,
          startTime: values.startTime,
          endTime: values.endTime,
        },
      });

      toast.success(`Ca làm của nhân viên ${shift.staffName} đã được cập nhật.`);

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === workScheduleErrorCodes.SHIFT_HAS_APPOINTMENTS) {
        setError('Ca làm này đang có lịch hẹn được phân công, không thể đổi ngày hoặc giờ.');
      } else if (code === workScheduleErrorCodes.SHIFT_CONFLICT) {
        setError('Ca làm bị chồng giờ với một ca khác của nhân viên trong ngày.');
      } else if (code === workScheduleErrorCodes.SHIFT_IN_PAST) {
        setError('Không thể sửa ca làm của ngày đã qua.');
      } else if (code === workScheduleErrorCodes.SHIFT_BEFORE_HIRE_DATE) {
        setError('Không thể chuyển ca về trước ngày vào làm của nhân viên.');
      } else if (code === workScheduleErrorCodes.STAFF_RESIGNED) {
        setError('Nhân viên đã nghỉ việc từ ngày này, không thể chuyển ca tới.');
      } else {
        setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi cập nhật ca làm.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa ca làm việc</DialogTitle>
          <DialogDescription>
            Điều chỉnh ngày hoặc giờ làm việc cho nhân viên{' '}
            <strong className="text-foreground">{shift?.staffName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-shift-date">
              Ngày làm việc <span className="text-destructive">*</span>
            </Label>
            <Input id="edit-shift-date" type="date" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-shift-startTime">
                Giờ bắt đầu <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-shift-startTime" type="time" {...register('startTime')} />
              {errors.startTime && (
                <p className="text-xs text-destructive">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-shift-endTime">
                Giờ kết thúc <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-shift-endTime" type="time" {...register('endTime')} />
              {errors.endTime && (
                <p className="text-xs text-destructive">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
