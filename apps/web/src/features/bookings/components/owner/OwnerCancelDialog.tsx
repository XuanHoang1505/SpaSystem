import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
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
import { bookingErrorKind, errorMessageOf } from '../../errors';
import { useOwnerCancelAppointment } from '../../hooks/owner/useOwnerAppointmentMutations';
import { ownerCancelSchema, type CancelAppointmentValues } from '../../schemas';
import type { ActionTarget } from './OwnerAppointmentActions';
import { ownerActionFailure } from './OwnerAppointmentActions';

export function OwnerCancelDialog({
  appointment,
  onClose,
}: {
  appointment: ActionTarget | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {appointment && <CancelForm id={appointment.id} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CancelForm({ id, onClose }: { id: string; onClose: () => void }) {
  const cancelMutation = useOwnerCancelAppointment();
  const [alert, setAlert] = useState<string | null>(null);

  const form = useForm<CancelAppointmentValues>({
    resolver: zodResolver(ownerCancelSchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setAlert(null);
    cancelMutation.mutate(
      { id, reason: values.reason.trim() },
      {
        onSuccess: () => {
          toast.success('Đã hủy lịch hẹn');
          onClose();
        },
        onError: (error) => {
          const kind = bookingErrorKind(error);
          if (kind === 'validation') {
            form.setError('reason', {
              message: errorMessageOf(error) ?? 'Lý do hủy không hợp lệ.',
            });
            return;
          }

          const failure = ownerActionFailure(error);
          if (failure.close) {
            onClose();
            if (failure.toast) toast.error(failure.toast);
          } else {
            if (failure.toast) toast.error(failure.toast);
            if (failure.alert) setAlert(failure.alert);
          }
        },
      },
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Hủy lịch hẹn?</DialogTitle>
        <DialogDescription>
          Quyền sử dụng hoặc buổi liệu trình sẽ được trả lại cho khách, không hoàn tiền.
        </DialogDescription>
      </DialogHeader>

      <FormField label="Lý do hủy" error={form.formState.errors.reason?.message} required>
        <Textarea rows={3} placeholder="Nhập lý do hủy lịch hẹn..." {...form.register('reason')} />
      </FormField>

      {alert && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{alert}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={cancelMutation.isPending}
        >
          Quay lại
        </Button>
        <Button type="submit" variant="destructive" loading={cancelMutation.isPending}>
          Xác nhận hủy
        </Button>
      </DialogFooter>
    </form>
  );
}
