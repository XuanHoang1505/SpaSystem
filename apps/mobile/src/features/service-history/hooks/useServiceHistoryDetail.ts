import { useQuery } from '@tanstack/react-query';
import type { ServiceHistoryDetail } from '@spa/shared-types';
import { callServiceHistory, serviceHistoryQueryKeys } from '@/lib/api/serviceHistory';
import { useAuthStore } from '@/stores/authStore';

export function useServiceHistoryDetail(appointmentId: string | null | undefined, enabled = true) {
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = status === 'authenticated';

  return useQuery<ServiceHistoryDetail>({
    queryKey: serviceHistoryQueryKeys.detail(appointmentId ?? ''),
    queryFn: ({ signal }) => callServiceHistory((api) => api.get(appointmentId!, signal)),
    enabled: isAuthenticated && enabled && Boolean(appointmentId),
  });
}
