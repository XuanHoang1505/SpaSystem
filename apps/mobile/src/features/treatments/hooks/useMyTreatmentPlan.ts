import { useQuery } from '@tanstack/react-query';
import { callTreatments, treatmentsQueryKeys } from '@/lib/api/appointments';
import { bookingsRetry } from '@/features/bookings/hooks/bookingsRetry';

export function useMyTreatmentPlan(treatmentId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: treatmentsQueryKeys.detail(treatmentId ?? ''),
    queryFn: ({ signal }) => callTreatments((api) => api.get(treatmentId!, signal)),
    enabled: Boolean(treatmentId) && enabled,
    retry: bookingsRetry,
  });
}
