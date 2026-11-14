import { useQuery } from '@tanstack/react-query';
import type {
  MyAppointmentListItem,
  MyAppointmentListParams,
  PagedResponse,
} from '@spa/shared-types';
import { appointmentsQueryKeys, callAppointments } from '@/lib/api/appointments';
import { useAuthStore } from '@/stores/authStore';
import { bookingsRetry } from './bookingsRetry';

export function useMyAppointments(params: MyAppointmentListParams) {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'authenticated';

  return useQuery<PagedResponse<MyAppointmentListItem>>({
    queryKey: appointmentsQueryKeys.list(params),
    queryFn: () => callAppointments((api) => api.list(params)),
    enabled: isAuthenticated,
    retry: bookingsRetry,
    staleTime: 15_000,
  });
}
