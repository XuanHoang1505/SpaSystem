import { Stack, usePathname } from 'expo-router';
import { RouteGuard } from '@components/auth/RouteGuard';

export default function TreatmentLayout() {
  const pathname = usePathname();
  return (
    <RouteGuard role="customer" redirect={pathname}>
      <Stack screenOptions={{ headerShown: false }} />
    </RouteGuard>
  );
}
