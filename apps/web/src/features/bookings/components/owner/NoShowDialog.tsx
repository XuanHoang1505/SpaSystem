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
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { bookingErrorKind, errorMessageOf } from '../../errors';
import { useMarkNoShow } from '../../hooks/owner/useOwnerAppointmentMutations';
import { noShowSchema, type NoShowValues } from '../../schemas';
import type { ActionTarget } from './OwnerAppointmentActions';
import { ownerActionFailure } from './OwnerAppointmentActions';

export function NoShowDialog({
  appointment,
  onClose,
}: {
  appointment: ActionTarget | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {appointment && <NoShowForm id={appointment.id} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function NoShowForm({ id, onClose }: { id: string; onClose: () => void }) {
  const noShowMutation = useMarkNoShow();
  const [alert, setAlert] = useState<string | null>(null);

  const form = useForm<NoShowValues>({
    resolver: zodResolver(noShowSchema),
    defaultValues: { note: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setAlert(null);
    const note = values.note?.trim() || undefined;
    noShowMutation.mutate(
      { id, note },
      {
        onSuccess: () => {
          toast.success('Đã ghi nhận khách không đến');
          onClose();
        },
        onError: (error) => {
          const kind = bookingErrorKind(error);
          if (kind === 'no_show_too_early') {
            setAlert(
              errorMessageOf(error) ?? 'Chỉ ghi nhận khách không đến sau giờ bắt đầu lịch hẹn.',
            );
            return;
          }
          if (kind === 'validation') {
            form.setError('note', {
              message: errorMessageOf(error) ?? 'Ghi chú không hợp lệ.',
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

  const description = catalogPolicies.noShowConsumesEntitlement
    ? 'Quyền sử dụng hoặc buổi liệu trình sẽ bị trừ.'
    : 'Quyền sử dụng hoặc buổi liệu trình được trả lại cho khách.';

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Ghi nhận khách không đến?</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <FormField label="Ghi chú" error={form.formState.errors.note?.message}>
        <Textarea
          rows={3}
          placeholder="Ghi chú thêm lý do hoặc tình huống (không bắt buộc)..."
          {...form.register('note')}
        />
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
          disabled={noShowMutation.isPending}
        >
          Quay lại
        </Button>
        <Button type="submit" loading={noShowMutation.isPending}>
          Xác nhận
        </Button>
      </DialogFooter>
    </form>
  );
}
