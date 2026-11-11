import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { errorCodeOf } from '@spa/api-client';
import type { TreatmentPlanDto, TreatmentPlanListItemDto } from '@spa/shared-types';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useUpdateTreatment } from '../../hooks/useOwnerTreatmentMutations';
import {
  updateTreatmentSchema,
  type UpdateTreatmentFormValues,
} from '../../schemas';

export interface UpdateTreatmentDialogProps {
  treatment: TreatmentPlanDto | TreatmentPlanListItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UpdateTreatmentDialog({
  treatment,
  open,
  onOpenChange,
  onSuccess,
}: UpdateTreatmentDialogProps) {
  const updateMutation = useUpdateTreatment();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateTreatmentFormValues>({
    resolver: zodResolver(updateTreatmentSchema),
    defaultValues: {
      goal: '',
      expectedEndDate: '',
      note: '',
    },
  });

  useEffect(() => {
    if (treatment && open) {
      const planDetail = treatment as TreatmentPlanDto;
      reset({
        goal: planDetail.goal ?? '',
        expectedEndDate: planDetail.expectedEndDate ?? '',
        note: planDetail.note ?? '',
      });
      setFormError(null);
    }
  }, [treatment, open, reset]);

  const onSubmit = async (values: UpdateTreatmentFormValues) => {
    if (!treatment) return;
    setFormError(null);

    const planDetail = treatment as TreatmentPlanDto;
    const startDate = planDetail.startDate;

    // BR-TRT-06: expectedEndDate must be >= startDate if startDate is present
    if (startDate && values.expectedEndDate && values.expectedEndDate < startDate) {
      setError('expectedEndDate', {
        type: 'manual',
        message: `Ngày dự kiến kết thúc phải từ ngày bắt đầu (${startDate}) trở đi.`,
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: treatment.id,
        body: {
          goal: values.goal ? values.goal.trim() : null,
          expectedEndDate: values.expectedEndDate ? values.expectedEndDate.trim() : null,
          note: values.note ? values.note.trim() : null,
        },
      });

      toast.success('Cập nhật phác đồ điều trị thành công.');
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === 'treatment_status_invalid') {
        setFormError('Trạng thái liệu trình không hợp lệ để chỉnh sửa.');
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Đã xảy ra lỗi khi cập nhật phác đồ.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cập nhật phác đồ điều trị</DialogTitle>
          <DialogDescription>
            {treatment ? `${treatment.packageName} — ${treatment.customer.fullName}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="goal">Mục tiêu điều trị</Label>
            <Textarea
              id="goal"
              rows={3}
              placeholder="Ví dụ: Giảm mụn viêm vùng má, phục hồi hàng rào ẩm cho da..."
              {...register('goal')}
            />
            {errors.goal && <p className="text-xs text-destructive">{errors.goal.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expectedEndDate">Ngày dự kiến hoàn thành</Label>
            <Input id="expectedEndDate" type="date" {...register('expectedEndDate')} />
            {errors.expectedEndDate && (
              <p className="text-xs text-destructive">{errors.expectedEndDate.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Ghi chú nội bộ</Label>
            <Textarea
              id="note"
              rows={3}
              placeholder="Ghi chú dành riêng cho nhân viên và chủ spa..."
              {...register('note')}
            />
            {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
