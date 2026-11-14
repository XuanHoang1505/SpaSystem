import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MyAppointment, RescheduleAppointmentRequest } from '@spa/shared-types';
import {
  appointmentsQueryKeys,
  availabilityQueryKeys,
  callAppointments,
  purchasesQueryKeys,
  treatmentsQueryKeys,
} from '@/lib/api/appointments';

export interface RescheduleMutationVariables {
  appointmentId: string;
  body: RescheduleAppointmentRequest;
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation<MyAppointment, Error, RescheduleMutationVariables>({
    mutationFn: ({ appointmentId, body }) =>
      callAppointments((api) => api.reschedule(appointmentId, body)),
    onSuccess: (updated) => {
      queryClient.setQueryData(appointmentsQueryKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: purchasesQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: treatmentsQueryKeys.all });
    },
  });
}
