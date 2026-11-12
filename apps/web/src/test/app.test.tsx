import { screen, render, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { vi, test, expect } from 'vitest';
import { AppProviders } from '@app/providers';
import { routeObjects } from '@app/router';
import { routes } from '@app/routes';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
vi.mock('@/hooks/useSystemStatus', () => ({
  useSystemStatus: () => ({ configurationError: undefined, isPending: false, isError: false }),
}));

test('App and public home render with foundation notice', async () => {
  const { App } = await import('@app/App');
  render(<App />);
  expect(screen.getByRole('heading', { name: /Một khoảng lặng/ })).toBeInTheDocument();
  expect(screen.getByText(/Phiên bản nền tảng/)).toBeInTheDocument();
});

test('Unknown routes render NotFoundPage', () => {
  render(
    <AppProviders>
      <RouterProvider router={createMemoryRouter(routeObjects, { initialEntries: ['/missing'] })} />
    </AppProviders>,
  );
  expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument();
});

/** Public routes with a real page (own tests) instead of the placeholder. */
const builtPages = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/services',
  '/services/:serviceId',
  '/packages',
  '/packages/:packageId',
];

function renderPlaceholder(path: string) {
  render(
    <AppProviders>
      <RouterProvider
        router={createMemoryRouter(routeObjects, {
          initialEntries: [path.replace(/:[^/]+/g, 'preview-id')],
        })}
      />
    </AppProviders>,
  );
}

test.each(routes.public.filter(([path]) => !builtPages.includes(path)))(
  'Public route %s renders its placeholder page',
  (path, title) => {
    useAuthStore.setState({ status: 'anonymous', accessToken: null, user: null });
    renderPlaceholder(path);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByText(/Tính năng đang được phát triển/)).toBeInTheDocument();
  },
);

test.each(['/services', '/services/preview-id', '/packages', '/packages/preview-id'])(
  'Catalog route %s renders a real page, not the placeholder (CAT-UI-T16)',
  async (path) => {
    useAuthStore.setState({ status: 'anonymous', accessToken: null, user: null });
    vi.stubEnv('VITE_API_BASE_URL', '');
    renderPlaceholder(path);
    expect(await screen.findByText('Lỗi cấu hình')).toBeInTheDocument();
    expect(screen.queryByText(/Tính năng đang được phát triển/)).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  },
);

test.each(
  (['customer', 'staff', 'owner'] as const).flatMap((role) =>
    routes[role].map(([path, title]) => [role, path, title] as const),
  ),
)('Signed-in %s sees %s placeholder', (role, path, title) => {
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: 'a',
    user: { id: 'u', fullName: 'Lan', email: 'lan@spa.vn', role },
  });
  renderPlaceholder(path);
  expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  expect(screen.getByText(/Tính năng đang được phát triển/)).toBeInTheDocument();
});

test('Button calls click and respects disabled and loading', () => {
  const onClick = vi.fn();
  const { rerender } = render(<Button onClick={onClick}>Tiếp tục</Button>);
  fireEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledTimes(1);
  rerender(
    <Button onClick={onClick} loading>
      Tiếp tục
    </Button>,
  );
  expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeDisabled();
  expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  fireEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledTimes(1);
});
