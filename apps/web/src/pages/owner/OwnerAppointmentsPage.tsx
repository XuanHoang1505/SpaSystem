import { OwnerAppointmentsView } from '@/features/bookings';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function OwnerAppointmentsPage() {
  useDocumentTitle('Lịch hẹn');
  return <OwnerAppointmentsView />;
}
