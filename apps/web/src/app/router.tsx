import type { ReactElement } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { routes } from './routes';
import { AuthLayout } from '@components/layout/AuthLayout/AuthLayout';
import { PublicLayout } from '@components/layout/PublicLayout/PublicLayout';
import { AccountLayout } from '@components/layout/AccountLayout/AccountLayout';
import { CheckoutLayout } from '@components/layout/CheckoutLayout/CheckoutLayout';
import { CustomerLayout } from '@components/layout/CustomerLayout/CustomerLayout';
import { StaffLayout } from '@components/layout/StaffLayout/StaffLayout';
import { OwnerLayout } from '@components/layout/OwnerLayout/OwnerLayout';
import { CartPage } from '@/pages/customer/CartPage';
import { CheckoutPage } from '@/pages/customer/CheckoutPage';
import { MyOrdersPage } from '@/pages/customer/MyOrdersPage';
import { PaymentResultPage } from '@/pages/customer/PaymentResultPage';
import { HomePage } from '@/pages/public/HomePage';
import { ForgotPasswordPage } from '@/pages/public/ForgotPasswordPage';
import { LoginPage } from '@/pages/public/LoginPage';
import { PackageDetailPage } from '@/pages/public/PackageDetailPage';
import { PackagesPage } from '@/pages/public/PackagesPage';
import { RegisterPage } from '@/pages/public/RegisterPage';
import { ServiceDetailPage } from '@/pages/public/ServiceDetailPage';
import { ServicesPage } from '@/pages/public/ServicesPage';
import { GuestOnly } from './GuestOnly';
import { RouteGuard } from './RouteGuard';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';

/** Public pages that are built; the other public routes still show the placeholder. */
const publicPages: Record<string, ReactElement> = {
  '/': <HomePage />,
  '/services': <ServicesPage />,
  '/services/:serviceId': <ServiceDetailPage />,
  '/packages': <PackagesPage />,
  '/packages/:packageId': <PackageDetailPage />,
};

/** Customer pages that are built; the other customer routes still show the placeholder. */
const customerPages: Record<string, ReactElement> = {
  '/cart': <CartPage />,
  '/checkout': <CheckoutPage />,
  '/payment/result': <PaymentResultPage />,
  '/my-orders': <MyOrdersPage />,
};

/** Login, register, forgot-password: own split layout without the site header/footer, guests only. */
const guestPages: Record<string, ReactElement> = {
  '/login': <LoginPage />,
  '/register': <RegisterPage />,
  '/forgot-password': <ForgotPasswordPage />,
};

/** The cart sits in the customer shell without the account menu; the checkout steps use the focused shell. */
const standalonePaths = new Set(['/cart']);
const focusedPaths = new Set(['/checkout', '/payment/result']);

/** Customer routes in three shells: my pages (header + account menu), the cart (header), the checkout (focused). */
function customerRouteObjects(): RouteObject[] {
  const page = ([path, title]: readonly [string, string]): RouteObject => ({
    path,
    element: customerPages[path] ?? <PlaceholderPage title={title} />,
  });
  const entries = routes.customer;
  return [
    {
      element: (
        <RouteGuard role="customer">
          <CustomerLayout />
        </RouteGuard>
      ),
      children: [
        ...entries.filter(([path]) => standalonePaths.has(path)).map(page),
        {
          element: <AccountLayout />,
          children: entries
            .filter(([path]) => !standalonePaths.has(path) && !focusedPaths.has(path))
            .map(page),
        },
      ],
    },
    {
      element: (
        <RouteGuard role="customer">
          <CheckoutLayout />
        </RouteGuard>
      ),
      children: entries.filter(([path]) => focusedPaths.has(path)).map(page),
    },
  ];
}

export const routeObjects: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      ...routes.public
        .filter(([path]) => !(path in guestPages))
        .map(([path, title]) => ({
          path,
          element: publicPages[path] ?? <PlaceholderPage title={title} />,
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
  ...customerRouteObjects(),
  ...(
    [
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
