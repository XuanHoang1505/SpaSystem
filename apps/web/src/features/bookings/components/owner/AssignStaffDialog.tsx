import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ApiClientError, appointmentErrorCodes } from '@spa/api-client';
import type { Availability, PublicStaffMember } from '@spa/shared-types';
import { ErrorState } from '@/components/shared/ErrorState/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge/StatusBadge';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { bookingErrorKind, errorMessageOf } from '../../errors';
import { useAvailability } from '../../hooks/useAvailability';
import { useAssignAppointmentStaff } from '../../hooks/owner/useOwnerAppointmentMutations';
import { useWorkingStaff } from '../../hooks/owner/useWorkingStaff';
import type { ActionTarget } from './OwnerAppointmentActions';
import { ownerActionFailure } from './OwnerAppointmentActions';

/** Staff ids with a free slot starting exactly at the appointment's start time. */
export function freeStaffAt(
  availability: Availability | undefined,
  startTime: string,
): ReadonlySet<string> {
  if (!availability) return new Set();
  const free = new Set<string>();
  for (const member of availability.staff) {
    if (member.slots.some((slot) => slot.startTime === startTime)) {
      free.add(member.id);
    }
  }
  return free;
}

export function AssignStaffDialog({
  appointment,
  onClose,
}: {
  appointment: ActionTarget | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={appointment !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        {appointment && (
          <AssignStaffForm key={appointment.id} appointment={appointment} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssignStaffForm({
  appointment,
  onClose,
}: {
  appointment: ActionTarget;
  onClose: () => void;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const staffQuery = useWorkingStaff(appointment.service.id);
  const availabilityQuery = useAvailability({ appointmentId: appointment.id }, appointment.date);
  const assignMutation = useAssignAppointmentStaff();

  const freeStaffIds = useMemo(
    () => freeStaffAt(availabilityQuery.data, appointment.startTime),
    [availabilityQuery.data, appointment.startTime],
  );

  const sortedStaff = useMemo(() => {
    if (!staffQuery.data?.items) return [];
    const free: PublicStaffMember[] = [];
    const busy: PublicStaffMember[] = [];

    for (const member of staffQuery.data.items) {
      if (freeStaffIds.has(member.id) && member.id !== appointment.staff.id) {
        free.push(member);
      } else {
        busy.push(member);
      }
    }

    free.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
    busy.sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));

    return [...free, ...busy];
  }, [staffQuery.data?.items, freeStaffIds, appointment.staff.id]);

  const otherStaff = useMemo(
    () => staffQuery.data?.items.filter((s) => s.id !== appointment.staff.id) ?? [],
    [staffQuery.data?.items, appointment.staff.id],
  );

  const fail = (error: unknown) => {
    const code = error instanceof ApiClientError ? error.errors[0]?.code : undefined;
    const message = errorMessageOf(error);
    const kind = bookingErrorKind(error);

    if (code === appointmentErrorCodes.staffNotQualified) {
      setAlert('Nhân viên này không thực hiện được dịch vụ của lịch hẹn. Hãy chọn người khác.');
      void staffQuery.refetch();
      return;
    }

    if (code === appointmentErrorCodes.staffNotFound) {
      setAlert('Không tìm thấy nhân viên này');
      void staffQuery.refetch();
      return;
    }

    if (kind === 'staff_unavailable') {
      setAlert((message ? `${message} ` : '') + 'Hãy chọn người khác.');
      void availabilityQuery.refetch();
      return;
    }

    if (kind === 'in_past') {
      toast.error(message ?? 'Lịch hẹn đã qua');
      void availabilityQuery.refetch();
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
    if (!selectedStaffId) return;
    setAlert(null);
    assignMutation.mutate(
      {
        id: appointment.id,
        staffMemberId: selectedStaffId,
      },
      {
        onSuccess: () => {
          toast.success('Đã đổi nhân viên');
          onClose();
        },
        onError: fail,
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Đổi nhân viên</DialogTitle>
        <DialogDescription>
          Chọn nhân viên thực hiện dịch vụ {appointment.service.name} cho lịch hẹn này.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {staffQuery.isLoading ? (
          <div data-testid="assign-staff-skeleton" className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : staffQuery.isError ? (
          <ErrorState
            title="Không tải được danh sách nhân viên"
            onRetry={() => void staffQuery.refetch()}
            retrying={staffQuery.isFetching}
          />
        ) : otherStaff.length === 0 ? (
          <p className="rounded-xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
            Không có nhân viên nào khác thực hiện được dịch vụ này.
          </p>
        ) : (
          <RadioGroup
            value={selectedStaffId ?? ''}
            onValueChange={setSelectedStaffId}
            className="gap-2"
          >
            {sortedStaff.map((member) => {
              const isCurrent = member.id === appointment.staff.id;
              const isFree = freeStaffIds.has(member.id);

              return (
                <Label
                  key={member.id}
                  htmlFor={`staff-radio-${member.id}`}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-xl border p-3 font-normal transition-colors',
                    selectedStaffId === member.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-muted/30',
                    isCurrent && 'cursor-not-allowed opacity-60 hover:bg-card',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem
                      id={`staff-radio-${member.id}`}
                      value={member.id}
                      disabled={isCurrent}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.fullName}</p>
                      {member.specialty && (
                        <p className="text-xs text-muted-foreground">{member.specialty}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    {isCurrent ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Đang phụ trách
                      </span>
                    ) : isFree ? (
                      <StatusBadge label="Rảnh giờ này" tone="success" />
                    ) : null}
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
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
          disabled={assignMutation.isPending}
        >
          Quay lại
        </Button>
        <Button disabled={!selectedStaffId} loading={assignMutation.isPending} onClick={confirm}>
          Xác nhận đổi nhân viên
        </Button>
      </DialogFooter>
    </>
  );
}
