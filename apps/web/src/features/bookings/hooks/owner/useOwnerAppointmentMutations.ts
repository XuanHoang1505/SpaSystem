import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { availabilityQueryKeys, ownerAppointmentsQueryKeys } from '@spa/api-client';
import type { AppointmentDetail, OwnerRescheduleAppointmentRequest } from '@spa/shared-types';
import { callOwnerAppointments } from '@/lib/api/appointments';

/** Every owner command can move an appointment: reload the lists, the details and the free slots. */
export function invalidateOwnerAppointments(queryClient: QueryClient) {
  return Promise.all(
    [ownerAppointmentsQueryKeys.all, availabilityQueryKeys.all].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

/** Shared shape of the five commands: write the returned detail, then reload either way. */
function useOwnerCommand<TVariables extends { id: string }>(
  run: (variables: TVariables) => Promise<AppointmentDetail>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (detail, variables) =>
      queryClient.setQueryData(ownerAppointmentsQueryKeys.detail(variables.id), detail),
    onSettled: () => invalidateOwnerAppointments(queryClient),
  });
}

export function useConfirmAppointment() {
  return useOwnerCommand(({ id }: { id: string }) =>
    callOwnerAppointments((api) => api.confirm(id)),
  );
}

export function useOwnerReschedule() {
  return useOwnerCommand(({ id, body }: { id: string; body: OwnerRescheduleAppointmentRequest }) =>
    callOwnerAppointments((api) => api.reschedule(id, body)),
  );
}

export function useAssignAppointmentStaff() {
  return useOwnerCommand(({ id, staffMemberId }: { id: string; staffMemberId: string }) =>
    callOwnerAppointments((api) => api.assignStaff(id, staffMemberId)),
  );
}

export function useOwnerCancelAppointment() {
  return useOwnerCommand(({ id, reason }: { id: string; reason: string }) =>
    callOwnerAppointments((api) => api.cancel(id, reason)),
  );
}

export function useMarkNoShow() {
  return useOwnerCommand(({ id, note }: { id: string; note?: string }) =>
    callOwnerAppointments((api) => api.markNoShow(id, note)),
  );
}
