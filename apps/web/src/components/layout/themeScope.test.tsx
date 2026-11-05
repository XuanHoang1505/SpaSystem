import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AppProviders } from '@app/providers';
import { routeObjects } from '@app/router';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@/hooks/useSystemStatus', () => ({
  useSystemStatus: () => ({ configurationError: undefined, isPending: false, isError: false }),
}));

const themeButton = { name: 'Đổi giao diện sáng/tối' };

function renderAt(path: string) {
  render(
    <AppProviders>
      <RouterProvider router={createMemoryRouter(routeObjects, { initialEntries: [path] })} />
    </AppProviders>,
  );
}

beforeEach(() => {
  localStorage.setItem('spa-theme', 'dark');
  // Workspaces are guarded from Task 4 on; sign in with the role each route needs.
  useAuthStore.setState({ status: 'authenticated', accessToken: 'a', user: null });
});
afterEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});

test('public pages stay light and have no theme toggle, even with dark saved', async () => {
  renderAt('/');
  await waitFor(() => expect(document.documentElement).toHaveClass('light'));
  expect(document.documentElement).not.toHaveClass('dark');
  expect(screen.queryByRole('button', themeButton)).not.toBeInTheDocument();
});

test('the customer workspace stays light and has no theme toggle', async () => {
  useAuthStore.setState({
    user: { id: 'c', fullName: 'Lan', email: 'lan@spa.vn', role: 'customer' },
  });
  renderAt('/account');
  await screen.findByRole('heading', { name: 'Tài khoản' });
  expect(document.documentElement).toHaveClass('light');
  expect(screen.queryByRole('button', themeButton)).not.toBeInTheDocument();
});

test('the owner workspace has the theme toggle and follows the saved theme', async () => {
  useAuthStore.setState({
    user: { id: 'o', fullName: 'Chủ spa', email: 'owner@spa.vn', role: 'owner' },
  });
  renderAt('/owner');
  expect(await screen.findByRole('button', themeButton)).toBeInTheDocument();
  await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
});
