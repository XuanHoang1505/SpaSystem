import { Redirect, useLocalSearchParams } from 'expo-router';

/** Old address of the appointment detail: the screen lives at `/booking/{id}` on the root stack. */
export default function Screen() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  return <Redirect href={bookingId ? `/booking/${bookingId}` : '/(customer)/bookings'} />;
}
