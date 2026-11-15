import { useQuery } from '@tanstack/react-query';
import { careQueryKeys } from '@spa/api-client';
import type { AssignedAppointmentListParams } from '@spa/shared-types';
import { bookingsRetry } from '@/features/bookings/hooks/bookingsRetry';
import { callCare } from '@/lib/api/care';

/**
 * SCR-M25: the signed-in staff member's assigned appointments.
 * `null` (invalid filter) disables fetching.
 */
export function useAssignedAppointments(params: AssignedAppointmentListParams | null) {
  return useQuery({
    queryKey: careQueryKeys.assigned(params ?? { fromDate: '', toDate: '' }),
    queryFn: ({ signal }) =>
      callCare((api) => api.listAssigned(params ?? { fromDate: '', toDate: '' }, signal)),
    enabled: params !== null,
    retry: bookingsRetry,
  });
}
