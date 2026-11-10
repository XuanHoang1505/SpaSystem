import { useSearchParams } from 'react-router-dom';
import { BookingSuccessView } from '@/features/bookings';

export function BookingSuccessPage() {
  const [search] = useSearchParams();
  return <BookingSuccessView search={search} />;
}
