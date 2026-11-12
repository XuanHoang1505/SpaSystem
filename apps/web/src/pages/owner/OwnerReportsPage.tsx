import { OwnerReportsView } from '@/features/reports';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function OwnerReportsPage() {
  useDocumentTitle('Tổng quan & Báo cáo doanh thu');
  return <OwnerReportsView />;
}
