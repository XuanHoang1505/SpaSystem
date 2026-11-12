import type { ApiResponse, Availability } from '@spa/shared-types';
import type { ApiClient } from './index';

/** Exactly one source (docs/specs/bookings.md, `GET /availability`); `appointmentId` is for moving that appointment. */
export type AvailabilitySource =
  | { spaServiceId: string }
  | { serviceEntitlementId: string }
  | { treatmentSessionId: string }
  | { appointmentId: string };

/** Free slots on one Vietnam date; the customer's Bearer hides slots that clash with their own appointments. */
export class AvailabilityApi {
  constructor(private readonly client: ApiClient) {}

  get(spaServiceId: string, date: string, signal?: AbortSignal) {
    return this.forSource({ spaServiceId }, date, undefined, signal);
  }

  forSource(
    source: AvailabilitySource,
    date: string,
    staffMemberId?: string,
    signal?: AbortSignal,
  ) {
    return this.client.get<ApiResponse<Availability>>('/api/v1/availability', {
      query: { ...source, date, staffMemberId },
      signal,
    });
  }
}

export const availabilityQueryKeys = {
  all: ['availability'] as const,
  service: (spaServiceId: string, date: string) => ['availability', spaServiceId, date] as const,
  source: (source: AvailabilitySource, date: string, staffMemberId?: string) =>
    ['availability', source, date, staffMemberId] as const,
};
