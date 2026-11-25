import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderDetail } from '@spa/shared-types';
import { callOrders, ordersQueryKeys } from '@/lib/api/orders';
import { ordersRetry } from './ordersRetry';

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 10;

export const latestPayment = (order: OrderDetail) =>
  [...order.payments].sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))[0];

// A later installment (docs/specs/order-installments.md) is paid while the order is already partially paid.
export const isWaiting = (order: OrderDetail | undefined) =>
  (order?.status === 'pending_payment' || order?.status === 'partially_paid') &&
  latestPayment(order)?.status === 'pending';

/** The installment the latest successful attempt paid, while later ones remain (null otherwise). */
export const paidInstallment = (order: OrderDetail | undefined) => {
  if (order?.status !== 'partially_paid') return null;
  const latest = latestPayment(order);
  return latest?.status === 'succeeded' ? latest.installmentSequenceNumber : null;
};

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

  // A paid order (or its first installment) empties the bought lines from the cart (BR-ORD-06).
  useEffect(() => {
    if (order?.status === 'paid' || order?.status === 'partially_paid') {
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
