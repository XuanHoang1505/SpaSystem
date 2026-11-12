import { useMutation, useQueryClient } from '@tanstack/react-query';
import { callAppointments } from '@/lib/api/appointments';
import { invalidateBooking } from './invalidateBooking';

/** Cancels the customer's own appointment (the right or session is given back); reloaded either way. */
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      callAppointments((api) => api.cancel(id, reason)),
    onSettled: () => invalidateBooking(queryClient),
  });
}
