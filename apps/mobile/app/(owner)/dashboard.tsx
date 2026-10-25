import { WorkspaceOverviewScreen } from '@/screens/WorkspaceOverviewScreen';
export default function Screen() {
  return (
    <WorkspaceOverviewScreen
      title="Tổng quan quản lý"
      links={[
        { href: '/(owner)/services', title: 'Dịch vụ' },
        { href: '/(owner)/staff', title: 'Nhân viên' },
        { href: '/(owner)/bookings', title: 'Lịch hẹn' },
        { href: '/(owner)/reports', title: 'Báo cáo' },
      ]}
    />
  );
}
