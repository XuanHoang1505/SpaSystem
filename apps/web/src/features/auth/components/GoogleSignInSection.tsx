import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApiClientError, authErrorCodes, errorCodeOf } from '@spa/api-client';
import type { GoogleSignup } from '@spa/shared-types';
import { readGoogleClientId } from '@/config/env';
import { loadGoogleIdentity } from '@/lib/google/googleIdentity';
import { authErrorMessage, UNKNOWN_ERROR } from '../errors';
import { useGoogleSignIn } from '../hooks/useGoogleSignIn';
import { useApiConfigured } from './ConfigurationAlert';
import { FormAlert } from './FormAlert';
import { GoogleSignupDialog } from './GoogleSignupDialog';

const alertCodes = new Set<string>([
  authErrorCodes.accountLocked,
  authErrorCodes.accountInactive,
  authErrorCodes.rateLimited,
  authErrorCodes.googleTokenInvalid,
  authErrorCodes.googleEmailUnverified,
  authErrorCodes.googleSignInNotAllowed,
  authErrorCodes.googleAccountConflict,
  authErrorCodes.googleSignInUnavailable,
]);

// Google renders the button in an iframe at a fixed pixel width (200–400).
const buttonWidth = (element: HTMLElement) =>
  Math.round(Math.min(400, Math.max(200, element.clientWidth || 320)));

/**
 * "Đăng nhập với Google" under the login and register forms (web only, Q-84). Hidden when `VITE_GOOGLE_CLIENT_ID` is not
 * set or the API URL is invalid. A first sign-in opens {@link GoogleSignupDialog} for the phone number.
 */
export function GoogleSignInSection({ mode }: { mode: 'signin' | 'signup' }) {
  const clientId = readGoogleClientId();
  const configured = useApiConfigured();
  if (!clientId || !configured) return null;
  return <GoogleSignIn clientId={clientId} mode={mode} />;
}

function GoogleSignIn({ clientId, mode }: { clientId: string; mode: 'signin' | 'signup' }) {
  const container = useRef<HTMLDivElement>(null);
  const signIn = useGoogleSignIn();
  const [signup, setSignup] = useState<GoogleSignup | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // The GIS callback is registered once; keep it pointing at the latest render.
  const onCredential = useRef<(credential: string) => void>(() => undefined);

  const handleCredential = (credential: string) => {
    setAlert(null);
    signIn.mutate(credential, {
      onSuccess: (result) => {
        if (result.profileRequired && result.signup) setSignup(result.signup);
      },
      onError: (error) => {
        const code = errorCodeOf(error);
        if (
          (code && alertCodes.has(code)) ||
          (error instanceof ApiClientError && error.status === 0)
        )
          setAlert(authErrorMessage(error));
        else toast.error(UNKNOWN_ERROR);
      },
    });
  };
  useEffect(() => {
    onCredential.current = handleCredential;
  });

  useEffect(() => {
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        const element = container.current;
        if (cancelled || !element) return;
        google.initialize({
          client_id: clientId,
          callback: (response) => onCredential.current(response.credential),
          ux_mode: 'popup',
          context: mode,
          auto_select: false,
        });
        element.replaceChildren();
        google.renderButton(element, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          logo_alignment: 'center',
          width: buttonWidth(element),
          locale: 'vi',
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, mode]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        hoặc
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <FormAlert message={alert} />
      {loadFailed ? (
        <p className="text-center text-xs text-muted-foreground">
          Không tải được đăng nhập bằng Google. Vui lòng kiểm tra mạng hoặc dùng email.
        </p>
      ) : (
        <div
          ref={container}
          aria-busy={signIn.isPending}
          className="flex min-h-10 w-full justify-center"
          data-testid="google-sign-in"
        />
      )}
      {signup && (
        <GoogleSignupDialog
          signup={signup}
          onClose={() => setSignup(null)}
          onExpired={(message) => {
            setSignup(null);
            setAlert(message);
          }}
        />
      )}
    </div>
  );
}
