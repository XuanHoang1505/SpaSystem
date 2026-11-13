import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { signOut } from '@/lib/api/session';

/** UC-SPA-02 A3: ends the session on the device whatever the API answers, clears cached data, then goes home. */
export function useLogOut() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  async function logOut() {
    setPending(true);
    try {
      await signOut();
      queryClient.clear();
      router.replace('/');
    } finally {
      setPending(false);
    }
  }

  return { pending, logOut };
}
