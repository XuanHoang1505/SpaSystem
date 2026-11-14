import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BookAppointmentRequest, MyAppointment } from '@spa/shared-types';
import {
  appointmentsQueryKeys,
  availabilityQueryKeys,
  callAppointments,
  purchasesQueryKeys,
  treatmentsQueryKeys,
} from '@/lib/api/appointments';

export function useBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation<MyAppointment, Error, BookAppointmentRequest>({
    mutationFn: (body) => callAppointments((api) => api.book(body)),
    onSuccess: (appointment) => {
      queryClient.setQueryData(appointmentsQueryKeys.detail(appointment.id), appointment);
      void queryClient.invalidateQueries({ queryKey: appointmentsQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: purchasesQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: treatmentsQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: availabilityQueryKeys.all });
    },
  });
}
