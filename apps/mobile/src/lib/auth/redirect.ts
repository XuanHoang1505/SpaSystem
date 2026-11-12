import type { UserRole } from '@spa/shared-types';

const authScreens = ['/(public)/login', '/(public)/register', '/(public)/forgot-password'];

/**
 * The `redirect` kept by `RouteGuard` is used only when it is an in-app path of the caller's own area or a public
 * screen (never the auth screens); anything else falls back to the role's home.
 */
export function safeRedirect(redirect: string | undefined, role: UserRole): string | null {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) return null;
  if (authScreens.some((path) => redirect.startsWith(path))) return null;
  if (redirect.startsWith(`/(${role})/`) || redirect.startsWith('/(public)/')) return redirect;
  return null;
}
