import { useQuery } from '@tanstack/react-query';
import { treatmentsQueryKeys } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callTreatments } from '@/lib/api/treatments';

/** The customer's treatment plan with its sessions; waits until the plan id is known. */
export function useMyTreatmentPlan(planId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: treatmentsQueryKeys.detail(planId ?? ''),
    queryFn: ({ signal }) => callTreatments((api) => api.get(planId ?? '', signal)),
    enabled: enabled && planId !== undefined,
    retry: ordersRetry,
  });
}
