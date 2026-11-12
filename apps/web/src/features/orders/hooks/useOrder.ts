import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersQueryKeys } from '@spa/api-client';
import type { OrderDetail } from '@spa/shared-types';
import { callOrders } from '@/lib/api/orders';
import { ordersRetry } from './ordersRetry';

interface UseOrderOptions {
  /** Milliseconds between reads, or a function of the latest order and the reads so far (`false` stops). */
  refetchInterval?:
    number | false | ((order: OrderDetail | undefined, readCount: number) => number | false);
}

export function useOrder(id: string | null, options: UseOrderOptions = {}) {
  const { refetchInterval } = options;
  const queryClient = useQueryClient();
  const queryKey = ordersQueryKeys.order(id ?? '');
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => callOrders((api) => api.getOrder(id ?? '', signal)),
    enabled: id !== null,
    retry: ordersRetry,
    refetchInterval:
      typeof refetchInterval === 'function'
        ? (query) => refetchInterval(query.state.data, query.state.dataUpdateCount)
        : refetchInterval,
  });
  // Successful reads so far (the first one included); re-evaluated on every render the query causes.
  const readCount = queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0;
  return { ...query, readCount };
}
