import { Navigate, useParams } from 'react-router-dom';
import { AppointmentDetailView } from '@/features/bookings';

export function MyAppointmentDetailPage() {
  const { bookingId } = useParams();
  return bookingId ? (
    <AppointmentDetailView appointmentId={bookingId} />
  ) : (
    <Navigate to="/my-bookings" replace />
  );
}
