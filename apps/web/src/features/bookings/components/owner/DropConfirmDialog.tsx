import { toast } from 'sonner';
import type { AppointmentListItem } from '@spa/shared-types';
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
import { errorMessageOf } from '../../errors';
import {
  useAssignAppointmentStaff,
  useOwnerReschedule,
} from '../../hooks/owner/useOwnerAppointmentMutations';
import type { DropCommand } from './dayGrid';

export interface DropConfirmDialogProps {
  pending: {
    appointment: AppointmentListItem;
    command: DropCommand;
    targetStaffName?: string;
  } | null;
  onClose: () => void;
}

export function DropConfirmDialog({ pending, onClose }: DropConfirmDialogProps) {
  const rescheduleMutation = useOwnerReschedule();
  const assignStaffMutation = useAssignAppointmentStaff();

  if (!pending) return null;

  const isReschedule = pending.command.kind === 'reschedule';
  const isPending = rescheduleMutation.isPending || assignStaffMutation.isPending;

  const title = isReschedule ? 'Đổi giờ hẹn?' : 'Đổi nhân viên?';
  const description =
    pending.command.kind === 'reschedule'
      ? `${pending.appointment.customer.fullName} · ${pending.appointment.service.name}: ${pending.appointment.startTime} → ${pending.command.startTime}, nhân viên ${pending.appointment.staff.fullName}`
      : `${pending.appointment.customer.fullName} · ${pending.appointment.service.name} lúc ${pending.appointment.startTime}: ${pending.appointment.staff.fullName} → ${pending.targetStaffName ?? ''}`;

  const confirmLabel = isReschedule ? 'Xác nhận đổi giờ' : 'Xác nhận đổi nhân viên';

  const onConfirm = () => {
    if (pending.command.kind === 'reschedule') {
      rescheduleMutation.mutate(
        {
          id: pending.appointment.id,
          body: {
            date: pending.appointment.date,
            startTime: pending.command.startTime,
          },
        },
        {
          onSuccess: () => {
            toast.success('Đã đổi giờ hẹn');
            onClose();
          },
          onError: (error) => {
            onClose();
            toast.error(errorMessageOf(error) ?? 'Không kết nối được máy chủ');
          },
        },
      );
    } else {
      assignStaffMutation.mutate(
        {
          id: pending.appointment.id,
          staffMemberId: pending.command.staffMemberId,
        },
        {
          onSuccess: () => {
            toast.success('Đã đổi nhân viên');
            onClose();
          },
          onError: (error) => {
            onClose();
            toast.error(errorMessageOf(error) ?? 'Không kết nối được máy chủ');
          },
        },
      );
    }
  };

  return (
    <AlertDialog open={pending !== null} onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={onClose}>
            Quay lại
          </AlertDialogCancel>
          <Button onClick={onConfirm} loading={isPending}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
