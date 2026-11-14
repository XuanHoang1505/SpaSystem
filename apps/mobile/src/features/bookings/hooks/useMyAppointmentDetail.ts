import { useQuery } from '@tanstack/react-query';
import type { MyAppointment, PurchasedPackage } from '@spa/shared-types';
import {
  appointmentsQueryKeys,
  callAppointments,
  callPurchases,
  purchasesQueryKeys,
} from '@/lib/api/appointments';
import { useAuthStore } from '@/stores/authStore';
import { isValidGuid } from '../utils/bookingHelpers';
import { bookingsRetry } from './bookingsRetry';

export function useMyAppointmentDetail(appointmentId: string | undefined) {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = status === 'authenticated';
  const validId = isValidGuid(appointmentId);

  const detailQuery = useQuery<MyAppointment>({
    queryKey: validId
      ? appointmentsQueryKeys.detail(appointmentId)
      : (['appointments', 'detail', 'invalid'] as const),
    queryFn: () => {
      if (!validId) throw new Error('Mã lịch hẹn không hợp lệ.');
      return callAppointments((api) => api.get(appointmentId));
    },
    enabled: isAuthenticated && validId,
    retry: bookingsRetry,
    staleTime: 15_000,
    // A hold past its deadline turns into hold_expired only when the server's order-expiry job runs, so check back
    // every 10 s until the status moves on, instead of trusting a single refetch at the deadline.
    refetchInterval: (query) => {
      const appointment = query.state.data;
      return appointment?.status === 'held' &&
        appointment.holdExpiresAtUtc &&
        Date.parse(appointment.holdExpiresAtUtc) <= Date.now()
        ? 10_000
        : false;
    },
  });

  const customerPackageId = detailQuery.data?.treatmentSession?.customerPackageId;

  const packageQuery = useQuery<PurchasedPackage>({
    queryKey: customerPackageId
      ? purchasesQueryKeys.package(customerPackageId)
      : (['purchases', 'package', 'none'] as const),
    queryFn: () => {
      if (!customerPackageId) throw new Error('No package ID.');
      return callPurchases((api) => api.getPackage(customerPackageId));
    },
    enabled: isAuthenticated && Boolean(customerPackageId),
    retry: 0,
    staleTime: 30_000,
  });

  return {
    ...detailQuery,
    purchasedPackage: packageQuery.data ?? null,
  };
}
