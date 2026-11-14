import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { RouteGuard } from '@components/auth/RouteGuard';

/** Path segments that are already in the pathname, so they are not repeated in the query. */
const pathParams = new Set(['bookingId']);

/** The booking screens live on the root stack but belong to customers: guard them like the `(customer)` group. */
export default function BookingLayout() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  // Keep every query value (date, startTime, staffMemberId from an AI proposal…) across the sign-in round trip.
  const query = Object.entries(params)
    .filter(([key, value]) => !pathParams.has(key) && typeof value === 'string' && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
    .join('&');

  return (
    <RouteGuard role="customer" redirect={query ? `${pathname}?${query}` : pathname}>
      <Stack screenOptions={{ headerShown: false }} />
    </RouteGuard>
  );
}
