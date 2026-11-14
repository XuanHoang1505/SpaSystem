import { useQuery } from '@tanstack/react-query';
import type { Availability } from '@spa/shared-types';
import { availabilityQueryKeys, callAvailability } from '@/lib/api/appointments';
import type { AvailabilitySource } from '@/lib/api/appointments';
import { bookingsRetry } from './bookingsRetry';

export function useAvailability(
  source: AvailabilitySource | null,
  date: string | undefined,
  enabled: boolean = true,
) {
  return useQuery<Availability>({
    queryKey:
      source && date
        ? availabilityQueryKeys.source(source, date)
        : (['availability', 'disabled'] as const),
    enabled: Boolean(source && date && enabled),
    retry: bookingsRetry,
    staleTime: 15_000,
    queryFn: () => {
      if (!source || !date) {
        throw new Error('Thiếu thông tin nguồn hoặc ngày cần tra cứu.');
      }
      return callAvailability((api) => api.forSource(source, date));
    },
  });
}
