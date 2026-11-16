import { Tabs } from 'expo-router';
import { RouteGuard } from '@components/auth/RouteGuard';
import { LayoutDashboard, CalendarDays, CalendarCheck, User } from 'lucide-react-native';
import { useCommonTabScreenOptions, tabIcon } from '@/config/navigation';

/**
 * Staff Bottom Navigation:
 * - Dashboard: Ca làm việc và tổng quan hôm nay
 * - Schedule: Lịch làm việc theo tuần
 * - Bookings: Các buổi chăm sóc khách hàng được phân công
 * - Profile: Thông tin nhân sự và đăng xuất
 */
export default function StaffLayout() {
  const screenOptions = useCommonTabScreenOptions();

  return (
    <RouteGuard role="staff">
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Tổng quan',
            tabBarIcon: tabIcon(LayoutDashboard),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Lịch làm việc',
            headerShown: false,
            tabBarIcon: tabIcon(CalendarDays),
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Lịch hẹn',
            headerShown: false,
            tabBarIcon: tabIcon(CalendarCheck),
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
          name="care-history"
          options={{
            title: 'Lịch sử chăm sóc',
            href: null,
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </RouteGuard>
  );
}
