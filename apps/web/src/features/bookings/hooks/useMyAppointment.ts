import { useQuery } from '@tanstack/react-query';
import { appointmentsQueryKeys } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callAppointments } from '@/lib/api/appointments';

/** One of the customer's own appointments. */
export function useMyAppointment(id: string) {
  return useQuery({
    queryKey: appointmentsQueryKeys.detail(id),
    queryFn: ({ signal }) => callAppointments((api) => api.get(id, signal)),
    retry: ordersRetry,
  });
}
