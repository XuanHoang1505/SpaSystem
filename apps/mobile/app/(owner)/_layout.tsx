import { Stack } from 'expo-router';
import { colors } from '@theme/index';
import { ownerScreens } from '@/config/navigation';
export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
      }}
    >
      {ownerScreens.map(([name, title]) => (
        <Stack.Screen key={name} name={name} options={{ title }} />
      ))}
    </Stack>
  );
}
