import { Tabs } from 'expo-router';
import { RouteGuard } from '@components/auth/RouteGuard';
import { LayoutDashboard, CalendarCheck, BarChart3, Users, User } from 'lucide-react-native';
import { useCommonTabScreenOptions, tabIcon } from '@/config/navigation';

/**
 * Owner Bottom Navigation:
 * - Dashboard: Tổng quan quản lý & kinh doanh
 * - Bookings: Quản lý lịch hẹn toàn spa
 * - Reports: Thống kê & báo cáo doanh thu
 * - Staff: Danh sách nhân viên & phân ca
 * - Profile: Thông tin chủ spa và đăng xuất
 */
export default function OwnerLayout() {
  const screenOptions = useCommonTabScreenOptions();

  return (
    <RouteGuard role="owner">
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Tổng quan',
            tabBarIcon: tabIcon(LayoutDashboard),
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Lịch hẹn',
            tabBarIcon: tabIcon(CalendarCheck),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Báo cáo',
            tabBarIcon: tabIcon(BarChart3),
          }}
        />
        <Tabs.Screen
          name="staff"
          options={{
            title: 'Nhân sự',
            tabBarIcon: tabIcon(Users),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Cá nhân',
            tabBarIcon: tabIcon(User),
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            title: 'Dịch vụ',
            href: null,
          }}
        />
      </Tabs>
    </RouteGuard>
  );
}
