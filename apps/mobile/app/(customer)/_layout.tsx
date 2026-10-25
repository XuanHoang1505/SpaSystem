import { Tabs } from 'expo-router';
import { colors } from '@theme/index';
import { customerTabs } from '@/config/navigation';
export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
      }}
    >
      {customerTabs.map(([name, title]) => (
        <Tabs.Screen key={name} name={name} options={{ title }} />
      ))}
      <Tabs.Screen name="ai-assistant" options={{ title: 'Trợ lý AI', href: null }} />
      <Tabs.Screen name="reviews" options={{ title: 'Đánh giá', href: null }} />
    </Tabs>
  );
}
