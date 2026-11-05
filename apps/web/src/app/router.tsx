import type { ReactElement } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { routes } from './routes';
import { PublicLayout } from '@components/layout/PublicLayout/PublicLayout';
import { CustomerLayout } from '@components/layout/CustomerLayout/CustomerLayout';
import { StaffLayout } from '@components/layout/StaffLayout/StaffLayout';
import { OwnerLayout } from '@components/layout/OwnerLayout/OwnerLayout';
import { HomePage } from '@/pages/public/HomePage';
import { ForgotPasswordPage } from '@/pages/public/ForgotPasswordPage';
import { LoginPage } from '@/pages/public/LoginPage';
import { RegisterPage } from '@/pages/public/RegisterPage';
import { GuestOnly } from './GuestOnly';
import { RouteGuard } from './RouteGuard';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';

const guestOnlyPaths = new Set<string>(['/login', '/register', '/forgot-password']);
const guestPages: Record<string, ReactElement> = {
  '/login': <LoginPage />,
  '/register': <RegisterPage />,
  '/forgot-password': <ForgotPasswordPage />,
};

export const routeObjects: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      ...routes.public.map(([path, title]) => ({
        path,
        element:
          path === '/' ? (
            <HomePage />
          ) : guestOnlyPaths.has(path) ? (
            <GuestOnly>{guestPages[path] ?? <PlaceholderPage title={title} />}</GuestOnly>
          ) : (
            <PlaceholderPage title={title} />
          ),
      })),
      { path: '/forbidden', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  ...(
    [
      { group: 'customer', element: <CustomerLayout /> },
      { group: 'staff', element: <StaffLayout /> },
      { group: 'owner', element: <OwnerLayout /> },
    ] as const
  ).map(({ group, element }) => ({
    element: <RouteGuard role={group}>{element}</RouteGuard>,
    children: routes[group].map(([path, title]) => ({
      path,
      element: <PlaceholderPage title={title} />,
    })),
  })),
];
export const createAppRouter = () => createBrowserRouter(routeObjects);
