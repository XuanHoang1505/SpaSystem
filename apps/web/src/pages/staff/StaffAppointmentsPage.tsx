import { StaffAppointmentsView } from '@/features/care';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function StaffAppointmentsPage() {
  useDocumentTitle('Lịch hẹn được phân công');
  return <StaffAppointmentsView />;
}
