import { useQuery } from '@tanstack/react-query';
import { catalogQueryKeys } from '@spa/api-client';
import type {
  MyTreatmentPlan,
  MyTreatmentSession,
  PurchasedService,
  ServiceDetail,
} from '@spa/shared-types';
import {
  callPurchases,
  callTreatments,
  purchasesQueryKeys,
  treatmentsQueryKeys,
} from '@/lib/api/appointments';
import { callCatalog } from '@/lib/api/catalog';
import { useAuthStore } from '@/stores/authStore';
import type { ParsedBookingSource } from '../utils/bookingHelpers';
import { bookingsRetry } from './bookingsRetry';

export type BookingSourceData =
  | {
      kind: 'service';
      service: ServiceDetail;
      canBook: boolean;
      ineligibleReason: string | null;
      earliestDate: null;
      primaryStaffId: null;
      primaryStaffName: null;
    }
  | {
      kind: 'entitlement';
      entitlement: PurchasedService;
      canBook: boolean;
      ineligibleReason: string | null;
      earliestDate: null;
      primaryStaffId: null;
      primaryStaffName: null;
    }
  | {
      kind: 'session';
      plan: MyTreatmentPlan;
      session: MyTreatmentSession;
      canBook: boolean;
      ineligibleReason: string | null;
      earliestDate: string | null;
      primaryStaffId: string | null;
      primaryStaffName: string | null;
    };

function getEntitlementIneligibleReason(entitlement: PurchasedService): string | null {
  if (entitlement.canBook && entitlement.status === 'available') {
    return null;
  }
  switch (entitlement.status) {
    case 'booked':
      return 'Quyền sử dụng dịch vụ này đã được gắn với một lịch hẹn khác.';
    case 'used':
      return 'Quyền sử dụng dịch vụ này đã được hoàn thành.';
    case 'expired':
      return 'Quyền sử dụng dịch vụ này đã quá hạn sử dụng.';
    default:
      return 'Quyền sử dụng dịch vụ này hiện không thể đặt lịch.';
  }
}

export function useBookingSource(parsed: ParsedBookingSource) {
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === 'authenticated';
  const isValid = parsed.valid;

  const queryKey = !parsed.valid
    ? (['booking-source', 'invalid'] as const)
    : parsed.kind === 'service'
      ? ([
          'booking-source',
          'service',
          parsed.serviceId,
          catalogQueryKeys.service(parsed.serviceId),
        ] as const)
      : parsed.kind === 'entitlement'
        ? ([
            'booking-source',
            'entitlement',
            parsed.serviceEntitlementId,
            purchasesQueryKeys.all,
          ] as const)
        : ([
            'booking-source',
            'session',
            parsed.treatmentSessionId,
            parsed.treatmentPlanId ?? 'auto',
            treatmentsQueryKeys.all,
          ] as const);

  return useQuery<BookingSourceData>({
    queryKey,
    enabled: isValid && isAuthenticated,
    retry: bookingsRetry,
    staleTime: 30_000,
    queryFn: async () => {
      if (!parsed.valid) {
        throw new Error(parsed.error);
      }

      if (parsed.kind === 'service') {
        const service = await callCatalog((api) => api.getService(parsed.serviceId));
        const isActive = service.status !== 'discontinued';
        return {
          kind: 'service',
          service,
          canBook: isActive,
          ineligibleReason: isActive ? null : 'Dịch vụ này hiện tạm ngừng nhận đặt lịch mới.',
          earliestDate: null,
          primaryStaffId: null,
          primaryStaffName: null,
        };
      }

      if (parsed.kind === 'entitlement') {
        const entitlement = await callPurchases((api) =>
          api.getService(parsed.serviceEntitlementId),
        );
        return {
          kind: 'entitlement',
          entitlement,
          canBook: entitlement.canBook && entitlement.status === 'available',
          ineligibleReason: getEntitlementIneligibleReason(entitlement),
          earliestDate: null,
          primaryStaffId: null,
          primaryStaffName: null,
        };
      }

      let plan: MyTreatmentPlan | undefined;
      if (parsed.treatmentPlanId) {
        plan = await callTreatments((api) => api.get(parsed.treatmentPlanId!));
      } else {
        // Fallback for links without treatmentPlanId (every in-app link should pass it): load the plans' details in
        // parallel rather than one after another, then pick the one holding the session.
        const plans = await callTreatments((api) => api.list());
        const details = await Promise.all(
          plans.map((item) => callTreatments((api) => api.get(item.id))),
        );
        plan = details.find((detail) =>
          detail.sessions.some((session) => session.id === parsed.treatmentSessionId),
        );
      }

      if (!plan) {
        throw new Error('Không tìm thấy liệu trình chứa buổi chăm sóc này.');
      }

      const session = plan.sessions.find((s) => s.id === parsed.treatmentSessionId);
      if (!session) {
        throw new Error('Không tìm thấy buổi chăm sóc trong liệu trình.');
      }

      return {
        kind: 'session',
        plan,
        session,
        canBook: session.canBook,
        ineligibleReason: session.canBook
          ? null
          : (session.reason ?? 'Buổi liệu trình này hiện chưa đủ điều kiện đặt lịch.'),
        earliestDate: session.earliestDate,
        primaryStaffId: plan.primaryStaff?.id ?? null,
        primaryStaffName: plan.primaryStaff?.fullName ?? null,
      };
    },
  });
}
