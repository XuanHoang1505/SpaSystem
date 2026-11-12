import { useQuery } from '@tanstack/react-query';
import { ownerAppointmentsQueryKeys } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callOwnerAppointments } from '@/lib/api/appointments';

/** One appointment with the owner's details (allergies, package session); `null` sends nothing. */
export function useOwnerAppointment(id: string | null) {
  return useQuery({
    queryKey: ownerAppointmentsQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => callOwnerAppointments((api) => api.get(id ?? '', signal)),
    enabled: id !== null,
    retry: ordersRetry,
  });
}
