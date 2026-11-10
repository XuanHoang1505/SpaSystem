import { ApiClientError, appointmentErrorCodes } from '@spa/api-client';
import type { PurchasedPackage, PurchasedService } from '@spa/shared-types';
import { usePurchases } from '@/features/purchases/hooks/usePurchases';
import { useTreatmentPlan } from '@/features/purchases/hooks/useTreatmentPlan';
import { useService } from '@/features/services';
import type { BookingSource } from '../bookingParams';

/** What the booking page needs to know about the thing being booked, whichever way it was reached. */
export interface ResolvedSource {
  kind: 'service' | 'entitlement' | 'session';
  name: string;
  durationMinutes: number;
  spaServiceId: string;
  packageName?: string;
  sequenceNumber?: number;
  totalSessions?: number;
  expiresAtUtc?: string | null;
  canBook: boolean;
  reason?: string | null;
  earliestDate?: string | null;
  price?: number;
  imageUrl?: string | null;
  /** Sessions of the package not yet done (session source only). */
  remainingSessions?: number;
}

const notFound = () =>
  new ApiClientError('Không tìm thấy quyền sử dụng.', 404, [
    { code: appointmentErrorCodes.entitlementNotFound, message: 'Không tìm thấy quyền sử dụng.' },
  ]);

const fromEntitlement = (item: PurchasedService): ResolvedSource => ({
  kind: 'entitlement',
  name: item.serviceName,
  durationMinutes: item.durationMinutes,
  spaServiceId: item.spaServiceId,
  expiresAtUtc: item.expiresAtUtc,
  canBook: item.canBook,
  imageUrl: item.imageUrl,
});

const fromNextSession = (item: PurchasedPackage): ResolvedSource | undefined => {
  const next = item.nextSession;
  if (!next) return undefined;
  return {
    kind: 'session',
    name: next.serviceName,
    durationMinutes: next.durationMinutes,
    spaServiceId: next.spaServiceId,
    packageName: item.packageName,
    sequenceNumber: next.sequenceNumber,
    totalSessions: item.totalSessions,
    expiresAtUtc: item.expiresAtUtc,
    canBook: next.canBook,
    earliestDate: next.earliestDate,
    imageUrl: item.imageUrl,
    remainingSessions: item.totalSessions - item.usedSessions,
  };
};

interface Result {
  data?: ResolvedSource;
  isPending: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Resolves the booking source into a name, a length and the booking rules. A session link prefers the treatment plan
 * and falls back to the purchases list when the plan id is missing or the plan no longer has the session.
 */
export function useBookingSource(source: BookingSource): Result {
  const service = useService(
    source.kind === 'service' ? source.serviceId : '',
    source.kind === 'service',
  );
  const planId = source.kind === 'session' ? source.treatmentPlanId : undefined;
  const plan = useTreatmentPlan(planId);
  const session =
    source.kind === 'session'
      ? plan.data?.sessions.find((item) => item.id === source.treatmentSessionId)
      : undefined;
  const needPurchases =
    source.kind === 'entitlement' ||
    (source.kind === 'session' && (!planId || plan.isError || (plan.isSuccess && !session)));
  const purchases = usePurchases(needPurchases);

  if (source.kind === 'service') {
    const data = service.data;
    return {
      data: data && {
        kind: 'service',
        name: data.name,
        durationMinutes: data.durationMinutes,
        spaServiceId: data.id,
        canBook: true,
        price: data.price,
        imageUrl: data.imageUrl,
      },
      isPending: service.isPending,
      error: service.error,
      refetch: () => void service.refetch(),
    };
  }

  if (source.kind === 'session' && planId && plan.data && session) {
    const data = plan.data;
    return {
      data: {
        kind: 'session',
        name: session.serviceName,
        durationMinutes: session.durationMinutes,
        spaServiceId: session.spaServiceId,
        packageName: data.packageName,
        sequenceNumber: session.sequenceNumber,
        totalSessions: data.totalSessions,
        expiresAtUtc: data.expiresAtUtc,
        canBook: session.canBook,
        reason: session.reason,
        earliestDate: session.earliestDate,
        imageUrl: data.imageUrl,
        remainingSessions: data.totalSessions - data.usedSessions,
      },
      isPending: false,
      error: null,
      refetch: () => void plan.refetch(),
    };
  }

  const waitingForPlan = Boolean(planId) && plan.isPending;
  const list = purchases.data;
  let data: ResolvedSource | undefined;
  if (list) {
    if (source.kind === 'entitlement') {
      const found = list.services.find((item) => item.id === source.serviceEntitlementId);
      data = found && fromEntitlement(found);
    } else {
      const found = list.packages.find(
        (item) => item.nextSession?.id === source.treatmentSessionId,
      );
      data = found && fromNextSession(found);
    }
  }
  return {
    data,
    isPending: waitingForPlan || (!data && !purchases.isError && (purchases.isPending || !list)),
    error: purchases.isError ? purchases.error : list && !data ? notFound() : null,
    refetch: () => void purchases.refetch(),
  };
}
