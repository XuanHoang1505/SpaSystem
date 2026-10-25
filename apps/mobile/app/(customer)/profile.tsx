import { WorkspaceOverviewScreen } from '@/screens/WorkspaceOverviewScreen';
export default function Screen() {
  return (
    <WorkspaceOverviewScreen
      title="Cá nhân"
      links={[
        { href: '/(public)/login', title: 'Đăng nhập' },
        { href: '/(public)/register', title: 'Đăng ký' },
        { href: '/(customer)/ai-assistant', title: 'Trợ lý AI' },
        { href: '/(customer)/reviews', title: 'Đánh giá dịch vụ' },
      ]}
    />
  );
}
