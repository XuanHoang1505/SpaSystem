import type { PropsWithChildren } from 'react';
import { useGlobalSearchParams, usePathname } from 'expo-router';
import { RouteGuard } from './RouteGuard';

/**
 * Guards a customer screen that lives on the root stack (cart, checkout, orders, bookings, packages, payment result…)
 * like the `(customer)` group: guests sign in and come back to the same path and query, staff and the owner see
 * `/forbidden`. `pathParams` are the dynamic segments already in the path, so they are not repeated in the query.
 */
export function CustomerRoute({
  pathParams = [],
  children,
}: PropsWithChildren<{ pathParams?: readonly string[] }>) {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  // Keep every query value (orderId, date, startTime, staffMemberId from an AI proposal…) across the sign-in round trip.
  const query = Object.entries(params)
    .filter(
      ([key, value]) => !pathParams.includes(key) && typeof value === 'string' && value !== '',
    )
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
    .join('&');

  return (
    <RouteGuard role="customer" redirect={query ? `${pathname}?${query}` : pathname}>
      {children}
    </RouteGuard>
  );
}
