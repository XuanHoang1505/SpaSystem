import type { ReactElement } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { routes } from './routes';
import { AuthLayout } from '@components/layout/AuthLayout/AuthLayout';
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

/** Login, register, forgot-password: own split layout without the site header/footer, guests only. */
const guestPages: Record<string, ReactElement> = {
  '/login': <LoginPage />,
  '/register': <RegisterPage />,
  '/forgot-password': <ForgotPasswordPage />,
};

export const routeObjects: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      ...routes.public
        .filter(([path]) => !(path in guestPages))
        .map(([path, title]) => ({
          path,
          element: path === '/' ? <HomePage /> : <PlaceholderPage title={title} />,
        })),
      { path: '/forbidden', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: Object.entries(guestPages).map(([path, page]) => ({
      path,
      element: <GuestOnly>{page}</GuestOnly>,
    })),
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
