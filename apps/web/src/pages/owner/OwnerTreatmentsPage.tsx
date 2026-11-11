import { OwnerTreatmentsView } from '@/features/treatments';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function OwnerTreatmentsPage() {
  useDocumentTitle('Quản lý liệu trình');
  return <OwnerTreatmentsView />;
}
