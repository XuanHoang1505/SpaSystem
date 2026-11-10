import type { ReactElement } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { routes } from './routes';
import { AuthLayout } from '@components/layout/AuthLayout/AuthLayout';
import { PublicLayout } from '@components/layout/PublicLayout/PublicLayout';
import { AccountLayout } from '@components/layout/AccountLayout/AccountLayout';
import { AccountSideNav } from '@components/layout/AccountLayout/AccountSideNav';
import { CheckoutLayout } from '@components/layout/CheckoutLayout/CheckoutLayout';
import { CustomerLayout } from '@components/layout/CustomerLayout/CustomerLayout';
import { StaffLayout } from '@components/layout/StaffLayout/StaffLayout';
import { OwnerLayout } from '@components/layout/OwnerLayout/OwnerLayout';
import { AccountPage } from '@/pages/customer/AccountPage';
import { AiAssistantPage } from '@/pages/customer/AiAssistantPage';
import { AiAssistantPublicPage } from '@/pages/public/AiAssistantPublicPage';
import { CartPage } from '@/pages/customer/CartPage';
import { CheckoutPage } from '@/pages/customer/CheckoutPage';
import { BookingPage } from '@/pages/customer/BookingPage';
import { BookingSuccessPage } from '@/pages/customer/BookingSuccessPage';
import { MyAppointmentDetailPage } from '@/pages/customer/MyAppointmentDetailPage';
import { MyAppointmentsPage } from '@/pages/customer/MyAppointmentsPage';
import { MyOrdersPage } from '@/pages/customer/MyOrdersPage';
import { MyPackageDetailPage } from '@/pages/customer/MyPackageDetailPage';
import { MyPackagesPage } from '@/pages/customer/MyPackagesPage';
import { MyServiceHistoryPage } from '@/pages/customer/MyServiceHistoryPage';
import { MyTreatmentPlanDetailPage } from '@/pages/customer/MyTreatmentPlanDetailPage';
import { MyTreatmentPlansPage } from '@/pages/customer/MyTreatmentPlansPage';
import { PaymentResultPage } from '@/pages/customer/PaymentResultPage';
import { OwnerAppointmentsPage } from '@/pages/owner/OwnerAppointmentsPage';
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
import { useAuthStore } from '@/stores/authStore';

function AccountRoute() {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'customer') {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <AccountSideNav />
        <div className="min-w-0">
          <AccountPage />
        </div>
      </div>
    );
  }
  return (
    <div className="container mx-auto max-w-4xl py-6">
      <AccountPage />
    </div>
  );
}

function AiAssistantRoute() {
  const user = useAuthStore((state) => state.user);
  if (user?.role === 'staff' || user?.role === 'owner') {
    return <ForbiddenPage />;
  }
  if (user?.role === 'customer') {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <AccountSideNav />
        <div className="min-w-0">
          <AiAssistantPage />
        </div>
      </div>
    );
  }
  return <AiAssistantPublicPage />;
}

/** Public pages that are built; the other public routes still show the placeholder. */
export const publicPages: Record<string, ReactElement> = {
  '/': <HomePage />,
  '/services': <ServicesPage />,
  '/services/:serviceId': <ServiceDetailPage />,
  '/packages': <PackagesPage />,
  '/packages/:packageId': <PackageDetailPage />,
  '/ai-assistant': <AiAssistantRoute />,
};

/** Customer pages that are built; the other customer routes still show the placeholder. */
export const customerPages: Record<string, ReactElement> = {
  '/account': <AccountPage />,
  '/cart': <CartPage />,
  '/booking/new': <BookingPage />,
  '/booking/success': <BookingSuccessPage />,
  '/checkout': <CheckoutPage />,
  '/payment/result': <PaymentResultPage />,
  '/my-bookings': <MyAppointmentsPage />,
  '/my-bookings/:bookingId': <MyAppointmentDetailPage />,
  '/my-orders': <MyOrdersPage />,
  '/my-treatment-plans': <MyTreatmentPlansPage />,
  '/my-treatment-plans/:id': <MyTreatmentPlanDetailPage />,
  '/my-history': <MyServiceHistoryPage />,
  '/my-packages': <MyPackagesPage />,
  '/my-packages/:packageId': <MyPackageDetailPage />,
  '/ai-assistant': <AiAssistantRoute />,
};

/** Owner pages that are built; the other owner routes still show the placeholder. */
export const ownerPages: Record<string, ReactElement> = {
  '/owner/bookings': <OwnerAppointmentsPage />,
};

/** Login, register, forgot-password: own split layout without the site header/footer, guests only. */
const guestPages: Record<string, ReactElement> = {
  '/login': <LoginPage />,
  '/register': <RegisterPage />,
  '/forgot-password': <ForgotPasswordPage />,
};

/** The cart sits in the customer shell without the account menu; the checkout steps use the focused shell. */
const standalonePaths = new Set(['/cart', '/booking/new', '/booking/success']);
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
            .filter(
              ([path]) =>
                !standalonePaths.has(path) && !focusedPaths.has(path) && path !== '/account',
            )
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
    element: (
      <RouteGuard>
        <PublicLayout />
      </RouteGuard>
    ),
    children: [
      {
        path: '/account',
        element: <AccountRoute />,
      },
    ],
  },
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
      { group: 'staff', element: <StaffLayout />, pages: {} as Record<string, ReactElement> },
      { group: 'owner', element: <OwnerLayout />, pages: ownerPages },
    ] as const
  ).map(({ group, element, pages }) => ({
    element: <RouteGuard role={group}>{element}</RouteGuard>,
    children: routes[group].map(([path, title]) => ({
      path,
      element: pages[path] ?? <PlaceholderPage title={title} />,
    })),
  })),
];
export const createAppRouter = () => createBrowserRouter(routeObjects);
