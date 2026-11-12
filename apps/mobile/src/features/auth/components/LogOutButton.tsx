import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AppButton } from '@components/common/AppButton';
import { signOut } from '@/lib/api/session';

/** UC-SPA-02 A3: ends the session on the device whatever the API answers, then goes home. */
export function LogOutButton() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  return (
    <AppButton
      title="Đăng xuất"
      variant="outline"
      loading={pending}
      onPress={async () => {
        setPending(true);
        await signOut();
        queryClient.clear();
        setPending(false);
        router.replace('/');
      }}
    />
  );
}
