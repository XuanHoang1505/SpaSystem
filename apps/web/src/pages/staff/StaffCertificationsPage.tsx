import { MyCertificationsView } from '@/features/staff';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function StaffCertificationsPage() {
  useDocumentTitle('Bằng cấp của tôi');
  return <MyCertificationsView />;
}
