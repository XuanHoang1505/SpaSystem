import type { UserRole } from '@spa/shared-types';

const authScreens = ['/(public)/login', '/(public)/register', '/(public)/forgot-password'];

/** Screens on the root stack, outside the role groups, that a signed-in user may come back to. */
const rootScreens: Record<UserRole, readonly string[]> = {
  customer: ['/booking', '/cart', '/checkout', '/payment', '/account', '/password'],
  staff: ['/account', '/password'],
  owner: ['/account', '/password'],
};

/** `/booking` matches `/booking`, `/booking/new?…` and `/booking?…`, never `/bookingsomething`. */
function isUnder(path: string, base: string) {
  return path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}?`);
}

/**
 * The `redirect` kept by `RouteGuard` is used only when it is an in-app path of the caller's own area (its role
 * group or its root-stack screens) or a public screen, never the auth screens; anything else falls back to the
 * role's home.
 */
export function safeRedirect(redirect: string | undefined, role: UserRole): string | null {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) return null;
  if (authScreens.some((path) => redirect.startsWith(path))) return null;
  if (redirect.startsWith(`/(${role})/`) || redirect.startsWith('/(public)/')) return redirect;
  if (rootScreens[role].some((base) => isUnder(redirect, base))) return redirect;
  return null;
}
