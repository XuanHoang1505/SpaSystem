import type { QueryClient } from '@tanstack/react-query';
import {
  appointmentsQueryKeys,
  availabilityQueryKeys,
  ordersQueryKeys,
  purchasesQueryKeys,
  treatmentsQueryKeys,
} from '@spa/api-client';

/** Everything a booking change can touch: appointments, free slots, bought rights, plans and (book now) orders. */
export function invalidateBooking(queryClient: QueryClient, options: { orders?: boolean } = {}) {
  const keys = [
    appointmentsQueryKeys.all,
    availabilityQueryKeys.all,
    purchasesQueryKeys.all,
    treatmentsQueryKeys.all,
    ...(options.orders ? [ordersQueryKeys.all] : []),
  ];
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
