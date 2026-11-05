import type { UserRole } from '@spa/shared-types';
import { routes } from '@app/routes';

const homePaths = { customer: '/account', staff: '/staff', owner: '/owner' } as const;

/** Where each role lands after login (UC-SPA-02 bước 6). */
export const homePathFor = (role: UserRole) => homePaths[role];

const authPages = new Set(['/login', '/register', '/forgot-password']);

const matches = (pattern: string, pathname: string) =>
  new RegExp(`^${pattern.replace(/:[^/]+/g, '[^/]+')}/?$`).test(pathname);

/**
 * The `redirect` query value when it is an in-app path the role may open (public or its own area), never an auth
 * page or another origin; otherwise the role's home.
 */
export function safeRedirect(redirect: string | null, role: UserRole): string {
  if (!redirect?.startsWith('/') || redirect.startsWith('//')) return homePathFor(role);
  const pathname = redirect.split(/[?#]/)[0] ?? '';
  if (authPages.has(pathname)) return homePathFor(role);
  const allowed = [...routes.public, ...routes[role]].some(([pattern]) =>
    matches(pattern, pathname),
  );
  return allowed ? redirect : homePathFor(role);
}

export const loginPathFor = (location: { pathname: string; search: string }) =>
  `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
