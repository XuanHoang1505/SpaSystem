import { screen, render, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, test, expect } from 'vitest';
import { AppProviders } from '@app/providers';
import { routeObjects } from '@app/router';
import { routes } from '@app/routes';
import { AppButton } from '@components/common/AppButton/AppButton';
import { RouteGuard } from '@app/RouteGuard';
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

test.each(
  Object.values(routes)
    .flat()
    .filter(([path]) => path !== '/'),
)('Route %s renders its placeholder page', (path, title) => {
  render(
    <AppProviders>
      <RouterProvider
        router={createMemoryRouter(routeObjects, {
          initialEntries: [path.replace(/:[^/]+/g, 'preview-id')],
        })}
      />
    </AppProviders>,
  );
  expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  expect(screen.getByText(/Tính năng đang được phát triển/)).toBeInTheDocument();
});

test('AppButton calls click and respects disabled and loading', () => {
  const onClick = vi.fn();
  const { rerender } = render(<AppButton onClick={onClick}>Tiếp tục</AppButton>);
  fireEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledTimes(1);
  rerender(
    <AppButton onClick={onClick} loading>
      Tiếp tục
    </AppButton>,
  );
  expect(screen.getByRole('button')).toBeDisabled();
  fireEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('RouteGuard denies missing session without simulating sign-in', async () => {
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RouteGuard role="owner">
              <p>Private content</p>
            </RouteGuard>
          }
        />
        <Route path="/forbidden" element={<p>Forbidden</p>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText('Forbidden')).toBeInTheDocument();
  expect(screen.queryByText('Private content')).not.toBeInTheDocument();
});
