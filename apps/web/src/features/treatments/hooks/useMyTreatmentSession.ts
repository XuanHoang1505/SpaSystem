import { useQuery } from '@tanstack/react-query';
import { treatmentsQueryKeys } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callTreatments } from '@/lib/api/treatments';

/** One session with its result note; fetched only while `enabled` (the dialog/sheet is open). */
export function useMyTreatmentSession(planId: string, sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: treatmentsQueryKeys.session(planId, sessionId),
    queryFn: ({ signal }) => callTreatments((api) => api.getSession(planId, sessionId, signal)),
    enabled: enabled && Boolean(planId && sessionId),
    retry: ordersRetry,
  });
}
