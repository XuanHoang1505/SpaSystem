import { useQuery } from '@tanstack/react-query';
import type { PagedResponse, ServiceHistoryItem } from '@spa/shared-types';
import {
  callServiceHistory,
  serviceHistoryQueryKeys,
  type ServiceHistoryParams,
} from '@/lib/api/serviceHistory';
import { useAuthStore } from '@/stores/authStore';

export function useServiceHistory(params: ServiceHistoryParams = {}, enabled = true) {
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = status === 'authenticated';

  return useQuery<PagedResponse<ServiceHistoryItem>>({
    queryKey: serviceHistoryQueryKeys.list(params),
    queryFn: ({ signal }) => callServiceHistory((api) => api.list(params, signal)),
    enabled: isAuthenticated && enabled,
  });
}
