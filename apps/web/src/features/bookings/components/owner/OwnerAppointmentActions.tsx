import { ApiClientError } from '@spa/api-client';
import type { AppointmentListItem } from '@spa/shared-types';
import type { OwnerAppointmentAction } from '../../appointmentStatus';
import { bookingErrorKind, errorMessageOf } from '../../errors';
import { AssignStaffDialog } from './AssignStaffDialog';
import { ConfirmAppointmentDialog } from './ConfirmAppointmentDialog';
import { NoShowDialog } from './NoShowDialog';
import { OwnerCancelDialog } from './OwnerCancelDialog';
import { OwnerRescheduleDialog } from './OwnerRescheduleDialog';

export type ActionTarget = Pick<
  AppointmentListItem,
  'id' | 'date' | 'startTime' | 'endTime' | 'status' | 'customer' | 'staff' | 'service'
>;

export function ownerActionFailure(error: unknown): {
  close: boolean;
  toast?: string;
  alert?: string;
} {
  const kind = bookingErrorKind(error);
  const message = errorMessageOf(error);

  if (kind === 'status_invalid') {
    return { close: true, toast: message ?? 'Lịch hẹn không còn ở trạng thái này.' };
  }
  if (kind === 'not_found') {
    return { close: true, toast: 'Không tìm thấy lịch hẹn' };
  }
  if (kind === 'network') {
    return { close: false, toast: 'Không kết nối được máy chủ' };
  }
  if (error instanceof ApiClientError && error.status >= 500) {
    return { close: false, toast: 'Không kết nối được máy chủ' };
  }
  return {
    close: false,
    alert: message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.',
  };
}

export function OwnerAppointmentActions({
  current,
  onClose,
}: {
  current: { action: OwnerAppointmentAction; appointment: ActionTarget } | null;
  onClose: () => void;
}) {
  if (!current) return null;

  switch (current.action) {
    case 'confirm':
      return <ConfirmAppointmentDialog appointment={current.appointment} onClose={onClose} />;
    case 'reschedule':
      return <OwnerRescheduleDialog appointment={current.appointment} onClose={onClose} />;
    case 'assign_staff':
      return <AssignStaffDialog appointment={current.appointment} onClose={onClose} />;
    case 'cancel':
      return <OwnerCancelDialog appointment={current.appointment} onClose={onClose} />;
    case 'no_show':
      return <NoShowDialog appointment={current.appointment} onClose={onClose} />;
    default:
      return null;
  }
}
