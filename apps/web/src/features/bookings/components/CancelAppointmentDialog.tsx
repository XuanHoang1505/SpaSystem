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
import { bookingErrorKind, errorMessageOf } from '../errors';
import { useCancelAppointment } from '../hooks/useCancelAppointment';
import { cancelAppointmentSchema, type CancelAppointmentValues } from '../schemas';

/** "Hủy lịch hẹn?": reason required; the right or session is given back, no refund (BR-BKG-10). */
export function CancelAppointmentDialog({
  appointment,
  onClose,
}: {
  appointment: { id: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {appointment && <CancelForm key={appointment.id} id={appointment.id} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CancelForm({ id, onClose }: { id: string; onClose: () => void }) {
  const cancel = useCancelAppointment();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CancelAppointmentValues>({
    resolver: zodResolver(cancelAppointmentSchema),
    defaultValues: { reason: '' },
  });

  const submit = form.handleSubmit((values) => {
    setError(null);
    cancel.mutate(
      { id, reason: values.reason.trim() },
      {
        onSuccess: () => {
          toast.success('Đã hủy lịch hẹn');
          onClose();
        },
        onError: (failure) => {
          const kind = bookingErrorKind(failure);
          const message = errorMessageOf(failure);
          if (kind === 'change_window') setError(message ?? 'Đã quá hạn hủy lịch hẹn này.');
          else if (kind === 'status_invalid')
            setError('Lịch hẹn không còn ở trạng thái có thể hủy.');
          else if (kind === 'validation')
            form.setError('reason', { message: message ?? 'Lý do hủy không hợp lệ.' });
          else if (kind === 'network') toast.error('Không kết nối được máy chủ');
          else setError('Đã có lỗi xảy ra, vui lòng thử lại.');
        },
      },
    );
  });

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Hủy lịch hẹn?</DialogTitle>
        <DialogDescription>
          Quyền sử dụng hoặc buổi liệu trình của bạn sẽ được trả lại, không hoàn tiền.
        </DialogDescription>
      </DialogHeader>
      <FormField label="Lý do hủy" error={form.formState.errors.reason?.message}>
        <Textarea rows={3} {...form.register('reason')} />
      </FormField>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Quay lại
        </Button>
        <Button type="submit" loading={cancel.isPending}>
          Xác nhận hủy
        </Button>
      </DialogFooter>
    </form>
  );
}
