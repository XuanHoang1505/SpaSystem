import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthResult, GoogleSignupCompleteRequest } from '@spa/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { callAuth } from './callAuth';

/** Same as a password login once there is a session: drop the previous user's cache, then store it. */
function useStartSession() {
  const queryClient = useQueryClient();
  return (session: AuthResult) => {
    queryClient.clear();
    useAuthStore.getState().setSession(session);
  };
}

/** Q-84: a Google credential either signs in (session) or starts the sign-up step (`profileRequired`). */
export function useGoogleSignIn() {
  const startSession = useStartSession();
  return useMutation({
    mutationFn: (idToken: string) => callAuth((api) => api.googleSignIn({ idToken })),
    onSuccess: (result) => {
      if (result.session) startSession(result.session);
    },
  });
}

/** Creates the customer account of a first Google sign-in with its phone number, then signs it in. */
export function useCompleteGoogleSignup() {
  const startSession = useStartSession();
  return useMutation({
    mutationFn: (values: GoogleSignupCompleteRequest) =>
      callAuth((api) => api.completeGoogleSignup(values)),
    onSuccess: startSession,
  });
}
