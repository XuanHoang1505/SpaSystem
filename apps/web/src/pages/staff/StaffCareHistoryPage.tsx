import { CareHistoryView } from '@/features/care';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function StaffCareHistoryPage() {
  useDocumentTitle('Lịch sử khách đã chăm sóc');
  return <CareHistoryView />;
}
