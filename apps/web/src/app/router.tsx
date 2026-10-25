import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { routes } from './routes';
import { PublicLayout } from '@components/layout/PublicLayout/PublicLayout';
import { CustomerLayout } from '@components/layout/CustomerLayout/CustomerLayout';
import { StaffLayout } from '@components/layout/StaffLayout/StaffLayout';
import { OwnerLayout } from '@components/layout/OwnerLayout/OwnerLayout';
import { HomePage } from '@/pages/public/HomePage';
import { AuthPlaceholderPage } from '@/pages/public/AuthPlaceholderPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';

export const routeObjects: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      ...routes.public.map(([path, title]) => ({
        path,
        element:
          path === '/' ? (
            <HomePage />
          ) : path === '/login' || path === '/register' ? (
            <AuthPlaceholderPage title={title} />
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
    element,
    children: routes[group].map(([path, title]) => ({
      path,
      element: <PlaceholderPage title={title} />,
    })),
  })),
];
export const createAppRouter = () => createBrowserRouter(routeObjects);
