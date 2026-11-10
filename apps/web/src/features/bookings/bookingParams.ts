const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** Where an appointment comes from (docs/specs/bookings.md): book now for a service, or use a bought right. */
export type BookingSource =
  | { kind: 'service'; serviceId: string }
  | { kind: 'entitlement'; serviceEntitlementId: string }
  | { kind: 'session'; treatmentSessionId: string; treatmentPlanId?: string };

export interface BookingPrefill {
  date?: string;
  startTime?: string;
  staffMemberId?: string;
}

export type BookingParams =
  { ok: true; source: BookingSource; prefill: BookingPrefill } | { ok: false };

const guid = (value: string | null): string | undefined =>
  value !== null && GUID.test(value) ? value : undefined;

/** Reads `/booking/new`: exactly one source, an optional plan id for a session, and an optional prefill. */
export function parseBookingParams(search: URLSearchParams): BookingParams {
  const keys = ['serviceId', 'serviceEntitlementId', 'treatmentSessionId'] as const;
  const present = keys.filter((key) => search.has(key));
  if (present.length !== 1) return { ok: false };

  const prefill: BookingPrefill = {};
  const date = search.get('date');
  const startTime = search.get('startTime');
  const staffMemberId = guid(search.get('staffMemberId'));
  if (date !== null && DATE.test(date)) prefill.date = date;
  if (startTime !== null && TIME.test(startTime)) prefill.startTime = startTime;
  if (staffMemberId) prefill.staffMemberId = staffMemberId;

  const serviceId = guid(search.get('serviceId'));
  if (present[0] === 'serviceId')
    return serviceId
      ? { ok: true, source: { kind: 'service', serviceId }, prefill }
      : { ok: false };

  const entitlementId = guid(search.get('serviceEntitlementId'));
  if (present[0] === 'serviceEntitlementId')
    return entitlementId
      ? { ok: true, source: { kind: 'entitlement', serviceEntitlementId: entitlementId }, prefill }
      : { ok: false };

  const sessionId = guid(search.get('treatmentSessionId'));
  if (!sessionId) return { ok: false };
  const planParam = search.get('treatmentPlanId');
  const treatmentPlanId = guid(planParam);
  if (planParam !== null && !treatmentPlanId) return { ok: false };
  return {
    ok: true,
    source: {
      kind: 'session',
      treatmentSessionId: sessionId,
      ...(treatmentPlanId ? { treatmentPlanId } : {}),
    },
    prefill,
  };
}

/** Link to `/booking/new` for a source, with an optional prefill. */
export function bookingPath(source: BookingSource, prefill: BookingPrefill = {}): string {
  const params = new URLSearchParams();
  if (source.kind === 'service') params.set('serviceId', source.serviceId);
  else if (source.kind === 'entitlement')
    params.set('serviceEntitlementId', source.serviceEntitlementId);
  else {
    params.set('treatmentSessionId', source.treatmentSessionId);
    if (source.treatmentPlanId) params.set('treatmentPlanId', source.treatmentPlanId);
  }
  if (prefill.date) params.set('date', prefill.date);
  if (prefill.startTime) params.set('startTime', prefill.startTime);
  if (prefill.staffMemberId) params.set('staffMemberId', prefill.staffMemberId);
  return `/booking/new?${params.toString()}`;
}
