import { useQuery } from '@tanstack/react-query';
import { treatmentsQueryKeys } from '@spa/api-client';
import type { TreatmentPlanStatus } from '@spa/shared-types';
import { ordersRetry } from '@/features/orders';
import { callTreatments } from '@/lib/api/treatments';

/** List of the customer's treatment plans (UC-SPA-19). */
export function useMyTreatments(status?: TreatmentPlanStatus, enabled = true) {
  return useQuery({
    queryKey: treatmentsQueryKeys.list(status),
    queryFn: ({ signal }) => callTreatments((api) => api.list(status, signal)),
    enabled,
    retry: ordersRetry,
  });
}
