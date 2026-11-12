import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BookNowRequest } from '@spa/shared-types';
import { callAppointments } from '@/lib/api/appointments';
import { invalidateBooking } from './invalidateBooking';

/** Holds a slot and creates its order; the same `idempotencyKey` returns the earlier result (BR-ORD-08). */
export function useBookNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: BookNowRequest; idempotencyKey: string }) =>
      callAppointments((api) => api.bookNow(body, idempotencyKey)),
    onSettled: () => invalidateBooking(queryClient, { orders: true }),
  });
}
