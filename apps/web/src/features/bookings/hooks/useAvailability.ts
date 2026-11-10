import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { availabilityQueryKeys, type AvailabilitySource } from '@spa/api-client';
import { ordersRetry } from '@/features/orders';
import { callAvailability } from '@/lib/api/appointments';

/** Free slots of a source on one Vietnam date; the previous day stays on screen while the next one loads. */
export function useAvailability(
  source: AvailabilitySource | null,
  date: string | null,
  staffMemberId?: string,
) {
  return useQuery({
    queryKey: availabilityQueryKeys.source(
      source ?? { spaServiceId: '' },
      date ?? '',
      staffMemberId,
    ),
    queryFn: ({ signal }) =>
      callAvailability((api) =>
        api.forSource(source as AvailabilitySource, date ?? '', staffMemberId, signal),
      ),
    enabled: source !== null && date !== null,
    placeholderData: keepPreviousData,
    retry: ordersRetry,
  });
}
