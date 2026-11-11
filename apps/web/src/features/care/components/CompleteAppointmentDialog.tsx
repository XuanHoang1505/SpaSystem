import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { AppointmentDetail, PackageProgress } from '@spa/shared-types';
import { FormField } from '@/components/shared/FormField/FormField';
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
import { Textarea } from '@/components/ui/textarea';
import { careErrorKind, careErrorMessage } from '../errors';
import { useCompleteAppointment } from '../hooks/useCareMutations';
import { completeSchema, type CompleteValues } from '../schemas';

/** "Gói X: đã dùng a/b buổi." plus "Gói đã hoàn thành." on the last session (BR-TRT-03). */
export function packageProgressMessage(progress: PackageProgress) {
  const used = `Gói ${progress.packageName}: đã dùng ${progress.usedSessions}/${progress.totalSessions} buổi.`;
  return progress.status === 'completed' ? `${used} Gói đã hoàn thành.` : used;
}

/** UC-SPA-28: confirm a visit is done, with an optional care result. */
export function CompleteAppointmentDialog({
  appointment,
  onClose,
  onNeedSkinProfile,
}: {
  appointment: AppointmentDetail | null;
  onClose: () => void;
  onNeedSkinProfile: () => void;
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {appointment && (
          <CompleteForm
            appointment={appointment}
            onClose={onClose}
            onNeedSkinProfile={onNeedSkinProfile}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CompleteForm({
  appointment,
  onClose,
  onNeedSkinProfile,
}: {
  appointment: AppointmentDetail;
  onClose: () => void;
  onNeedSkinProfile: () => void;
}) {
  const mutation = useCompleteAppointment();
  const form = useForm<CompleteValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: { result: '' },
  });

  const onError = (error: Error) => {
    switch (careErrorKind(error)) {
      case 'too_early':
        toast.error('Chưa tới giờ bắt đầu, chưa xác nhận hoàn thành được.');
        return;
      case 'profile_required':
        toast.error('Cần lập hồ sơ da trước khi hoàn thành.');
        onClose();
        onNeedSkinProfile();
        return;
      case 'validation':
        form.setError('result', { message: careErrorMessage(error) ?? 'Kết quả không hợp lệ.' });
        return;
      case 'status_invalid':
      case 'entitlement':
      case 'not_assigned':
        toast.error(careErrorMessage(error) ?? 'Không xác nhận hoàn thành được buổi này.');
        onClose();
        return;
      default:
        toast.error(careErrorMessage(error) ?? 'Không xác nhận được, vui lòng thử lại.');
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(
      { id: appointment.id, result: values.result?.trim() || null },
      {
        onSuccess: ({ packageProgress }) => {
          toast.success('Đã ghi nhận buổi chăm sóc hoàn thành.', {
            description: packageProgress ? packageProgressMessage(packageProgress) : undefined,
          });
          onClose();
        },
        onError,
      },
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Xác nhận hoàn thành buổi chăm sóc</DialogTitle>
        <DialogDescription>
          Sau khi xác nhận, buổi này được tính là đã sử dụng và không hoàn tác được.
        </DialogDescription>
      </DialogHeader>

      {!appointment.hasSkinProfile && (
        <Alert>
          <AlertDescription>Buổi này chưa có hồ sơ da.</AlertDescription>
        </Alert>
      )}

      <FormField label="Kết quả chăm sóc" error={form.formState.errors.result?.message}>
        <Textarea
          rows={4}
          placeholder="Tình trạng da sau buổi, lưu ý cho buổi sau (không bắt buộc)..."
          {...form.register('result')}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Quay lại
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          Xác nhận hoàn thành
        </Button>
      </DialogFooter>
    </form>
  );
}
