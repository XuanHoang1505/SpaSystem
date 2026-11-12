import { OwnerStaffView } from '@/features/staff';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function OwnerStaffPage() {
  useDocumentTitle('Nhân viên & lịch làm việc');
  return <OwnerStaffView />;
}
