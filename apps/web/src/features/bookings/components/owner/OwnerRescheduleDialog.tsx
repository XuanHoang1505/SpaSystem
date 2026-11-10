import { useState } from 'react';
import { toast } from 'sonner';
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
import { addDays, durationMinutes, vietnamNow } from '@/lib/formatting/vietnamTime';
import { DateStrip } from '../DateStrip';
import { StaffSlotPicker, type PickedSlot } from '../StaffSlotPicker';
import { bookingErrorKind, errorMessageOf } from '../../errors';
import { useAvailability } from '../../hooks/useAvailability';
import { useOwnerReschedule } from '../../hooks/owner/useOwnerAppointmentMutations';
import type { ActionTarget } from './OwnerAppointmentActions';
import { ownerActionFailure } from './OwnerAppointmentActions';

export function OwnerRescheduleDialog({
  appointment,
  onClose,
}: {
  appointment: ActionTarget | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {appointment && (
          <RescheduleForm key={appointment.id} appointment={appointment} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RescheduleForm({
  appointment,
  onClose,
}: {
  appointment: ActionTarget;
  onClose: () => void;
}) {
  const [today] = useState(() => vietnamNow());
  const maxDate = addDays(today.date, catalogPolicies.maxBookingDaysAhead);

  const initialDate =
    appointment.date >= today.date && appointment.date <= maxDate ? appointment.date : today.date;

  const [date, setDate] = useState(initialDate);
  const [picked, setPicked] = useState<PickedSlot | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const rescheduleMutation = useOwnerReschedule();
  const availability = useAvailability(
    { appointmentId: appointment.id },
    date,
    appointment.staff.id,
  );
  const day = availability.data && availability.data.date === date ? availability.data : undefined;
  const duration = durationMinutes(appointment.startTime, appointment.endTime);

  const fail = (error: unknown) => {
    const kind = bookingErrorKind(error);
    const message = errorMessageOf(error);

    if (kind === 'slot_taken') {
      setAlert(message ?? 'Giờ vừa hết chỗ: giờ bạn chọn vừa có người đặt hoặc nhân viên đã bận.');
      setPicked(null);
      void availability.refetch();
      return;
    }

    if (kind === 'in_past') {
      toast.error(message ?? 'Giờ này đã qua');
      setPicked(null);
      void availability.refetch();
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
  };

  const confirm = () => {
    if (!picked) return;
    setAlert(null);
    rescheduleMutation.mutate(
      {
        id: appointment.id,
        body: {
          date,
          startTime: picked.startTime,
        },
      },
      {
        onSuccess: () => {
          toast.success('Đã đổi giờ hẹn');
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
        <DialogDescription>
          {`Lịch giữ nguyên nhân viên ${appointment.staff.fullName} và thời lượng ${duration} phút. Muốn đổi người, dùng Đổi nhân viên.`}
        </DialogDescription>
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
            fixedStaffId={appointment.staff.id}
            emptyText="Nhân viên này không còn giờ trống trong ngày đã chọn."
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
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={rescheduleMutation.isPending}
        >
          Quay lại
        </Button>
        <Button disabled={!picked} loading={rescheduleMutation.isPending} onClick={confirm}>
          Xác nhận đổi giờ
        </Button>
      </DialogFooter>
    </>
  );
}
