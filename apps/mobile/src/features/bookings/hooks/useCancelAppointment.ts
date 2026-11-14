import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import type { MyAppointment } from '@spa/shared-types';
import {
  appointmentsQueryKeys,
  availabilityQueryKeys,
  callAppointments,
  purchasesQueryKeys,
  treatmentsQueryKeys,
} from '@/lib/api/appointments';

export interface CancelAppointmentMutationVariables {
  appointmentId: string;
  reason: string;
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation<MyAppointment, Error, CancelAppointmentMutationVariables>({
    mutationFn: ({ appointmentId, reason }) =>
      callAppointments((api) => api.cancel(appointmentId, reason)),
    onSuccess: (updated) => {
      queryClient.setQueryData(appointmentsQueryKeys.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: purchasesQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: treatmentsQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}
