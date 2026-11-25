import { StaffOverviewView } from '@/features/staff';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function StaffOverviewPage() {
  useDocumentTitle('Tổng quan nhân viên');
  return <StaffOverviewView />;
}
