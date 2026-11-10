import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { appointmentsQueryKeys } from '@spa/api-client';
import type { MyAppointmentListParams } from '@spa/shared-types';
import { ordersRetry } from '@/features/orders';
import { callAppointments } from '@/lib/api/appointments';

/** The signed-in customer's appointments of one scope; the previous page stays while the next loads. */
export function useMyAppointments(params: MyAppointmentListParams) {
  return useQuery({
    queryKey: appointmentsQueryKeys.list(params),
    queryFn: ({ signal }) => callAppointments((api) => api.list(params, signal)),
    placeholderData: keepPreviousData,
    retry: ordersRetry,
  });
}
