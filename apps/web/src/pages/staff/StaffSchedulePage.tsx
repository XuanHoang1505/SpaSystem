import { MyScheduleView } from '@/features/staff';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function StaffSchedulePage() {
  useDocumentTitle('Lịch làm việc');
  return <MyScheduleView />;
}
