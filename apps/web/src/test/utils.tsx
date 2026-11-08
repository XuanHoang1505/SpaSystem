import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/formatting/formatters';
export function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Tiền như trên màn hình, để so bằng getByText (Testing Library đổi khoảng trắng không ngắt thành dấu cách). */
export const money = (value: number) => formatCurrency(value).replace(/\s/g, ' ');
