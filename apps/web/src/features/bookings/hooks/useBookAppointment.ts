import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BookAppointmentRequest } from '@spa/shared-types';
import { callAppointments } from '@/lib/api/appointments';
import { invalidateBooking } from './invalidateBooking';

/** Books with a bought service or a package session (no payment). */
export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BookAppointmentRequest) => callAppointments((api) => api.book(body)),
    onSettled: () => invalidateBooking(queryClient),
  });
}
