import { useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useConfirmAppointment } from '../../hooks/owner/useOwnerAppointmentMutations';
import type { ActionTarget } from './OwnerAppointmentActions';
import { ownerActionFailure } from './OwnerAppointmentActions';

export function ConfirmAppointmentDialog({
  appointment,
  onClose,
}: {
  appointment: ActionTarget | null;
  onClose: () => void;
}) {
  const confirmMutation = useConfirmAppointment();
  const [alert, setAlert] = useState<string | null>(null);

  if (!appointment) return null;

  const onConfirm = () => {
    setAlert(null);
    confirmMutation.mutate(
      { id: appointment.id },
      {
        onSuccess: () => {
          toast.success('Đã xác nhận lịch hẹn');
          onClose();
        },
        onError: (error) => {
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
  };

  return (
    <AlertDialog open={appointment !== null} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận lịch hẹn này?</AlertDialogTitle>
          <AlertDialogDescription>
            Lịch hẹn sẽ chuyển sang trạng thái Đã xác nhận.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {alert && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{alert}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={confirmMutation.isPending}>
            Quay lại
          </AlertDialogCancel>
          <Button loading={confirmMutation.isPending} onClick={onConfirm}>
            Xác nhận
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
