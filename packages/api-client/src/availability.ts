import type { ApiResponse, Availability } from '@spa/shared-types';
import type { ApiClient } from './index';

/** Free slots of a service on one Vietnam date (anonymous). */
export class AvailabilityApi {
  constructor(private readonly client: ApiClient) {}

  get(spaServiceId: string, date: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<Availability>>('/api/v1/availability', {
      query: { spaServiceId, date },
      signal,
    });
  }
}

export const availabilityQueryKeys = {
  all: ['availability'] as const,
  service: (spaServiceId: string, date: string) => ['availability', spaServiceId, date] as const,
};
