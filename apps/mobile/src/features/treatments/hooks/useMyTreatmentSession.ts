import { useQuery } from '@tanstack/react-query';
import { callTreatments, treatmentsQueryKeys } from '@/lib/api/appointments';
import { bookingsRetry } from '@/features/bookings/hooks/bookingsRetry';

export function useMyTreatmentSession(
  treatmentId: string | undefined,
  sessionId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: treatmentsQueryKeys.session(treatmentId ?? '', sessionId ?? ''),
    queryFn: ({ signal }) =>
      callTreatments((api) => api.getSession(treatmentId!, sessionId!, signal)),
    enabled: Boolean(treatmentId && sessionId) && enabled,
    retry: bookingsRetry,
  });
}
