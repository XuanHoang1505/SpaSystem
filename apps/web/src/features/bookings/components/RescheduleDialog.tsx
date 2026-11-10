import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { AppointmentStaff } from '@spa/shared-types';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
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
import { Skeleton } from '@/components/ui/skeleton';
import { catalogPolicies } from '@/features/services/catalogPolicies';
import { addDays, vietnamNow } from '@/lib/formatting/vietnamTime';
import { bookingErrorKind, errorMessageOf } from '../errors';
import { useAvailability } from '../hooks/useAvailability';
import { useRescheduleAppointment } from '../hooks/useRescheduleAppointment';
import { DateStrip } from './DateStrip';
import { StaffSlotPicker, type PickedSlot } from './StaffSlotPicker';

/** "Đổi giờ hẹn": free hours for moving this appointment (the API ignores its own slot), then one confirm. */
export function RescheduleDialog({
  appointment,
  onClose,
}: {
  appointment: { id: string; staff: AppointmentStaff } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {appointment && (
          <RescheduleForm
            key={appointment.id}
            id={appointment.id}
            currentStaffId={appointment.staff.id}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RescheduleForm({
  id,
  currentStaffId,
  onClose,
}: {
  id: string;
  currentStaffId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [today] = useState(() => vietnamNow());
  const maxDate = addDays(today.date, catalogPolicies.maxBookingDaysAhead);
  const [date, setDate] = useState(today.date);
  const [picked, setPicked] = useState<PickedSlot | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const reschedule = useRescheduleAppointment();
  const availability = useAvailability({ appointmentId: id }, date);
  const day = availability.data && availability.data.date === date ? availability.data : undefined;

  const fail = (error: unknown) => {
    const kind = bookingErrorKind(error);
    const message = errorMessageOf(error);
    switch (kind) {
      case 'slot_taken':
        setAlert(
          'Giờ vừa hết chỗ: giờ bạn chọn vừa có người đặt hoặc bạn đã có lịch khác lúc này.',
        );
        setPicked(null);
        void availability.refetch();
        break;
      case 'change_window':
        toast.error(message ?? 'Đã quá hạn đổi lịch hẹn này.');
        onClose();
        break;
      case 'status_invalid':
        toast.error(message ?? 'Lịch hẹn không còn ở trạng thái có thể đổi.');
        onClose();
        break;
      case 'not_found':
        onClose();
        navigate('/my-bookings');
        break;
      case 'session_too_early':
      case 'session_too_late':
      case 'not_eligible':
        setAlert(message ?? 'Không đổi được lịch hẹn này sang giờ đã chọn.');
        break;
      case 'in_past':
        toast.error('Giờ này đã qua');
        setPicked(null);
        void availability.refetch();
        break;
      case 'staff':
        toast.error('Kỹ thuật viên này không còn nhận dịch vụ này');
        setPicked(null);
        void availability.refetch();
        break;
      case 'network':
        toast.error('Không kết nối được máy chủ');
        break;
      default:
        setAlert('Đã có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const confirm = () => {
    if (!picked) return;
    setAlert(null);
    reschedule.mutate(
      {
        id,
        body: {
          date,
          startTime: picked.startTime,
          ...(picked.staffMemberId ? { staffMemberId: picked.staffMemberId } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success('Đã đổi lịch');
          onClose();
        },
        onError: fail,
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Đổi giờ hẹn</DialogTitle>
        <DialogDescription>Chọn ngày, giờ và kỹ thuật viên mới cho lịch hẹn này.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <DateStrip
          value={date}
          minDate={today.date}
          maxDate={maxDate}
          onChange={(next) => {
            setDate(next);
            setPicked(null);
          }}
        />
        {availability.isError ? (
          <ErrorState
            title="Không tải được giờ trống"
            onRetry={() => void availability.refetch()}
            retrying={availability.isFetching}
          />
        ) : !day ? (
          <div data-testid="reschedule-skeleton" className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <StaffSlotPicker
            availability={day}
            date={date}
            selected={picked}
            onSelect={setPicked}
            currentStaffId={currentStaffId}
            now={today}
          />
        )}
        {alert && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{alert}</AlertDescription>
          </Alert>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Quay lại
        </Button>
        <Button disabled={!picked} loading={reschedule.isPending} onClick={confirm}>
          Xác nhận đổi lịch
        </Button>
      </DialogFooter>
    </>
  );
}
