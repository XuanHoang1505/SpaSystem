import { Redirect, Tabs } from 'expo-router';
import { Home, CalendarCheck, Sparkles, Package, User } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useCommonTabScreenOptions, tabIcon } from '@/config/navigation';

/**
 * Customer & Guest Bottom Navigation:
 * - Available for anonymous guests and authenticated customers.
 * - If a staff or owner lands here, auto-redirect to their workspace.
 */
export default function CustomerLayout() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const screenOptions = useCommonTabScreenOptions();

  if (status === 'authenticated' && user?.role === 'staff') {
    return <Redirect href="/(staff)/dashboard" />;
  }
  if (status === 'authenticated' && user?.role === 'owner') {
    return <Redirect href="/(owner)/dashboard" />;
  }

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Trang chủ',
          headerShown: false,
          tabBarIcon: tabIcon(Home),
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
        name="treatments"
        options={{
          title: 'Liệu trình',
          tabBarIcon: tabIcon(Sparkles),
        }}
      />
      <Tabs.Screen
        name="packages"
        options={{
          title: 'Gói của tôi',
          tabBarIcon: tabIcon(Package),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          tabBarIcon: tabIcon(User),
        }}
      />
      <Tabs.Screen
        name="ai-assistant"
        options={{
          title: 'Trợ lý AI',
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <Tabs.Screen name="reviews" options={{ title: 'Đánh giá', href: null }} />
    </Tabs>
  );
}
