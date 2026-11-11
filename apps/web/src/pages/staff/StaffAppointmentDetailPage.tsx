import { useParams } from 'react-router-dom';
import { StaffAppointmentDetailView } from '@/features/care';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function StaffAppointmentDetailPage() {
  useDocumentTitle('Chi tiết buổi chăm sóc');
  const { appointmentId = '' } = useParams();
  return <StaffAppointmentDetailView key={appointmentId} appointmentId={appointmentId} />;
}
