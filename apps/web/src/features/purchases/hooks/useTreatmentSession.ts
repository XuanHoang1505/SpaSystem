import { useQuery } from '@tanstack/react-query';
import { treatmentsQueryKeys } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callTreatments } from '@/lib/api/treatments';

/** One session with its result note; fetched only while `enabled` (the dialog is open). */
export function useTreatmentSession(planId: string, sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: treatmentsQueryKeys.session(planId, sessionId),
    queryFn: ({ signal }) => callTreatments((api) => api.getSession(planId, sessionId, signal)),
    enabled,
    retry: ordersRetry,
  });
}
