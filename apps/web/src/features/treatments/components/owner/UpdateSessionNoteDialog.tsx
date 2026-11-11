import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { errorCodeOf } from '@spa/api-client';
import type { TreatmentSessionDto } from '@spa/shared-types';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useUpdateSessionNote } from '../../hooks/useOwnerTreatmentMutations';
import {
  updateSessionNoteSchema,
  type UpdateSessionNoteFormValues,
} from '../../schemas';

export interface UpdateSessionNoteDialogProps {
  treatmentId: string;
  session: TreatmentSessionDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UpdateSessionNoteDialog({
  treatmentId,
  session,
  open,
  onOpenChange,
  onSuccess,
}: UpdateSessionNoteDialogProps) {
  const updateNoteMutation = useUpdateSessionNote();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateSessionNoteFormValues>({
    resolver: zodResolver(updateSessionNoteSchema),
    defaultValues: {
      note: '',
    },
  });

  useEffect(() => {
    if (session && open) {
      reset({
        note: session.note ?? '',
      });
      setFormError(null);
    }
  }, [session, open, reset]);

  const onSubmit = async (values: UpdateSessionNoteFormValues) => {
    if (!session) return;
    setFormError(null);

    try {
      await updateNoteMutation.mutateAsync({
        id: treatmentId,
        sessionId: session.id,
        body: {
          note: values.note ? values.note.trim() : null,
        },
      });

      toast.success('Đã cập nhật ghi chú buổi chăm sóc.');
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const code = errorCodeOf(err);
      if (code === 'treatment_session_not_found') {
        setFormError('Không tìm thấy buổi chăm sóc trong liệu trình.');
      } else if (code === 'treatment_session_completed') {
        setFormError('Chỉ chủ spa mới có quyền chỉnh sửa ghi chú của buổi đã hoàn thành.');
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Đã xảy ra lỗi khi cập nhật ghi chú.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ghi chú buổi chăm sóc</DialogTitle>
          <DialogDescription>
            {session
              ? `Buổi ${session.sequenceNumber}: ${session.serviceName}`
              : 'Cập nhật ghi chú buổi điều trị'}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="session-note">Ghi chú / Kết quả buổi chăm sóc</Label>
            <Textarea
              id="session-note"
              rows={4}
              placeholder="Nhập ghi chú chuyên môn, phản ứng da của khách, lưu ý buổi sau (tối đa 2000 ký tự)..."
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
              {isSubmitting ? 'Đang lưu...' : 'Lưu ghi chú'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
