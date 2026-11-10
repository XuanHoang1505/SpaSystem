import { useSearchParams } from 'react-router-dom';
import { BookingView } from '@/features/bookings';

export function BookingPage() {
  const [search] = useSearchParams();
  return <BookingView search={search} />;
}
