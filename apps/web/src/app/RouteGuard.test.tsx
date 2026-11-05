import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { beforeEach, expect, test } from 'vitest';
import type { UserRole } from '@spa/shared-types';
import { useAuthStore } from '@/stores/authStore';
import { GuestOnly } from './GuestOnly';
import { RouteGuard } from './RouteGuard';

function Where() {
  const location = useLocation();
  return <p>at {location.pathname + location.search}</p>;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/owner', element: <RouteGuard role="owner">Owner area</RouteGuard> },
      { path: '/login', element: <GuestOnly>Login form</GuestOnly> },
      { path: '*', element: <Where /> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const signIn = (role: UserRole) =>
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: 'a',
    user: { id: 'u', fullName: 'Lan', email: 'lan@spa.vn', role },
  });

beforeEach(() =>
  useAuthStore.setState({ status: 'anonymous', accessToken: null, user: null, endReason: null }),
);

test('anonymous visitors are sent to login with a redirect back', async () => {
  const router = renderAt('/owner?tab=1');
  expect(await screen.findByText('Login form')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/login');
  expect(router.state.location.search).toBe('?redirect=%2Fowner%3Ftab%3D1');
});

test('while leaving after a logout the guard goes home, not to login', async () => {
  useAuthStore.setState({ status: 'anonymous', endReason: 'logout' });
  const router = renderAt('/owner');
  expect(await screen.findByText('at /')).toBeInTheDocument();
  expect(router.state.location.search).toBe('');
});

test('a wrong role goes to /forbidden', async () => {
  signIn('customer');
  renderAt('/owner');
  expect(await screen.findByText('at /forbidden')).toBeInTheDocument();
});

test('the right role sees the area', () => {
  signIn('owner');
  renderAt('/owner');
  expect(screen.getByText('Owner area')).toBeInTheDocument();
});

test('while the session is restoring nothing redirects yet', () => {
  useAuthStore.setState({ status: 'restoring' });
  const router = renderAt('/owner');
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(router.state.location.pathname).toBe('/owner');
});

test('GuestOnly sends a signed-in user to their area', async () => {
  signIn('owner');
  renderAt('/login');
  expect(await screen.findByText('Owner area')).toBeInTheDocument();
});

test('GuestOnly honours a safe redirect after login', async () => {
  signIn('owner');
  renderAt('/login?redirect=%2Fowner%2Fstaff');
  expect(await screen.findByText('at /owner/staff')).toBeInTheDocument();
});

test('GuestOnly ignores an unsafe redirect', async () => {
  signIn('owner');
  renderAt('/login?redirect=%2F%2Fevil.com');
  expect(await screen.findByText('Owner area')).toBeInTheDocument();
});

test('GuestOnly shows the page to anonymous visitors', () => {
  renderAt('/login');
  expect(screen.getByText('Login form')).toBeInTheDocument();
});
