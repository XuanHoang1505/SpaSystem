import { Tabs } from 'expo-router';
import { RouteGuard } from '@components/auth/RouteGuard';
import { LayoutDashboard, CalendarDays, CalendarCheck, User } from 'lucide-react-native';
import { useCommonTabScreenOptions } from '@/config/navigation';

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
            tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Lịch làm việc',
            tabBarIcon: ({ color, size }) => <CalendarDays size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Lịch hẹn',
            tabBarIcon: ({ color, size }) => <CalendarCheck size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Cá nhân',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
    </RouteGuard>
  );
}
