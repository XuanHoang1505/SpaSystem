import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ownerAppointmentsQueryKeys } from '@spa/api-client';
import type { AppointmentListParams } from '@spa/shared-types';
import { ordersRetry } from '@/features/orders';
import { callOwnerAppointments } from '@/lib/api/appointments';

/** The owner's appointment list (UC-SPA-17); `null` (invalid range) sends nothing. The previous page stays while loading. */
export function useOwnerAppointments(params: AppointmentListParams | null) {
  return useQuery({
    queryKey: ownerAppointmentsQueryKeys.list(params ?? { fromDate: '', toDate: '' }),
    queryFn: ({ signal }) =>
      callOwnerAppointments((api) => api.list(params as AppointmentListParams, signal)),
    enabled: params !== null,
    placeholderData: keepPreviousData,
    retry: ordersRetry,
  });
}
