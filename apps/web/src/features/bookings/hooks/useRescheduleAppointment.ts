import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RescheduleAppointmentRequest } from '@spa/shared-types';
import { callAppointments } from '@/lib/api/appointments';
import { invalidateBooking } from './invalidateBooking';

/** Moves the customer's own appointment; reloaded on success or failure (the flags may have changed). */
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: RescheduleAppointmentRequest }) =>
      callAppointments((api) => api.reschedule(id, body)),
    onSettled: () => invalidateBooking(queryClient),
  });
}
