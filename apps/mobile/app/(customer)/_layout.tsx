import { Redirect, Tabs } from 'expo-router';
import { Home, CalendarCheck, Sparkles, Package, User } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useCommonTabScreenOptions } from '@/config/navigation';

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
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
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
        name="treatments"
        options={{
          title: 'Liệu trình',
          tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="packages"
        options={{
          title: 'Gói của tôi',
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="ai-assistant" options={{ title: 'Trợ lý AI', href: null }} />
      <Tabs.Screen name="reviews" options={{ title: 'Đánh giá', href: null }} />
    </Tabs>
  );
}
