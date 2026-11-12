import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { AvailabilityApi, availabilityQueryKeys } from '@spa/api-client';
import type { Availability } from '@spa/shared-types';
import { catalogRetry, useCatalogQueryEnabled } from '@/features/services';
import { callApi } from '@/lib/api/call';
import { addDays, vietnamNow } from '@/lib/formatting/vietnamTime';

const MAX_TIMES_PER_DAY = 6;

export interface NextSlotsDay {
  date: string;
  label: 'Hôm nay' | 'Ngày mai';
  /** Giờ bắt đầu còn trống của bất kỳ kỹ thuật viên nào, tăng dần; undefined khi chưa tải xong. */
  times?: string[];
}

/** Giờ bắt đầu (HH:mm) không trùng nhau của mọi nhân viên, sau `after` nếu có, tối đa `MAX_TIMES_PER_DAY`. */
export function mergeStartTimes(availability: Availability, after?: string): string[] {
  const times = new Set(
    availability.staff.flatMap((member) => member.slots.map((slot) => slot.startTime)),
  );
  return [...times]
    .filter((time) => after === undefined || time > after)
    .sort()
    .slice(0, MAX_TIMES_PER_DAY);
}

/**
 * Giờ trống hôm nay và ngày mai (giờ Việt Nam) của một dịch vụ từ `GET /availability` (ẩn danh; Bearer khách hàng ẩn
 * giờ trùng lịch của chính họ). Hôm nay bỏ các giờ đã qua.
 */
export function useNextSlots(spaServiceId: string) {
  const enabled = useCatalogQueryEnabled();
  const [now] = useState(() => vietnamNow());
  const dates = [now.date, addDays(now.date, 1)] as const;
  const queries = useQueries({
    queries: dates.map((date) => ({
      queryKey: availabilityQueryKeys.service(spaServiceId, date),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        callApi(
          (client) => new AvailabilityApi(client),
          (api) => api.get(spaServiceId, date, signal),
        ),
      retry: catalogRetry,
      enabled,
    })),
  });

  const days: NextSlotsDay[] = dates.map((date, index) => {
    const data = queries[index]?.data;
    return {
      date,
      label: index === 0 ? 'Hôm nay' : 'Ngày mai',
      times: data && mergeStartTimes(data, index === 0 ? now.time : undefined),
    };
  });

  return {
    days,
    isError: queries.some((query) => query.isError),
    retry: () => queries.forEach((query) => query.isError && void query.refetch()),
  };
}
