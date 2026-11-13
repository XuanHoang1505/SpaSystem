import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderDetail } from '@spa/shared-types';
import { callOrders, ordersQueryKeys } from '@/lib/api/orders';
import { ordersRetry } from './ordersRetry';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 10;

export const latestPayment = (order: OrderDetail) =>
  [...order.payments].sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))[0];

export const isWaiting = (order: OrderDetail | undefined) =>
  order?.status === 'pending_payment' && latestPayment(order)?.status === 'pending';

export function useOrderPolling(orderId: string | null | undefined) {
  const queryClient = useQueryClient();
  const pollCountRef = useRef(0);
  const [isPollingTimeout, setIsPollingTimeout] = useState(false);

  useEffect(() => {
    pollCountRef.current = 0;
    setIsPollingTimeout(false);
  }, [orderId]);

  const query = useQuery<OrderDetail>({
    queryKey: ordersQueryKeys.order(orderId ?? ''),
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      const data = await callOrders((api) => api.getOrder(orderId));
      if (isWaiting(data)) {
        pollCountRef.current += 1;
        if (pollCountRef.current >= MAX_POLLS) {
          setIsPollingTimeout(true);
        }
      }
      return data;
    },
    enabled: Boolean(orderId),
    retry: ordersRetry,
    refetchInterval: (queryResult) => {
      const data = queryResult.state.data;
      if (isWaiting(data) && pollCountRef.current < MAX_POLLS) {
        return POLL_INTERVAL_MS;
      }
      return false;
    },
  });

  const order = query.data;

  // Invalidate cart once order is paid
  useEffect(() => {
    if (order?.status === 'paid') {
      void queryClient.invalidateQueries({ queryKey: ordersQueryKeys.cart });
    }
  }, [order?.status, queryClient]);

  const isPolling = isWaiting(order) && pollCountRef.current < MAX_POLLS;

  return {
    ...query,
    order,
    isWaiting: isWaiting(order),
    isPolling,
    isPollingTimeout,
    pollCount: pollCountRef.current,
  };
}
