import { useQuery } from '@tanstack/react-query';
import type { TreatmentPlanStatus } from '@spa/shared-types';
import { callTreatments, treatmentsQueryKeys } from '@/lib/api/appointments';
import { bookingsRetry } from '@/features/bookings/hooks/bookingsRetry';

export function useMyTreatments(status?: TreatmentPlanStatus, enabled = true) {
  return useQuery({
    queryKey: treatmentsQueryKeys.list(status),
    queryFn: ({ signal }) => callTreatments((api) => api.list(status, signal)),
    enabled,
    retry: bookingsRetry,
  });
}
