import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { TreatmentSearchParams } from '@spa/shared-types';
import { callOwnerTreatments } from '@/lib/api/treatments';
import { treatmentManageQueryKeys } from '../treatmentQueryKeys';

/** Searches treatment plans with pagination and filters (UC-SPA-21 / SCR-W36). */
export function useOwnerTreatmentSearch(params: TreatmentSearchParams, enabled = true) {
  return useQuery({
    queryKey: treatmentManageQueryKeys.list(params),
    queryFn: ({ signal }) => callOwnerTreatments((api) => api.search(params, signal)),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Fetches full treatment plan details (UC-SPA-21). */
export function useOwnerTreatment(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: treatmentManageQueryKeys.detail(id ?? ''),
    queryFn: ({ signal }) => callOwnerTreatments((api) => api.get(id!, signal)),
    enabled: Boolean(id) && enabled,
  });
}
