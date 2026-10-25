import { WorkspaceOverviewScreen } from '@/screens/WorkspaceOverviewScreen';
export default function Screen() {
  return (
    <WorkspaceOverviewScreen
      title="Tổng quan nhân viên"
      links={[
        { href: '/(staff)/schedule', title: 'Lịch làm việc' },
        { href: '/(staff)/bookings', title: 'Lịch hẹn được phân công' },
      ]}
    />
  );
}
