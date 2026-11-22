import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { authResult, callsTo, envelope, mockApi, renderApp } from '@/test/mockApi';

// Leaving for VNPay is a full page load; record it instead.
const redirect = vi.hoisted(() => ({ to: vi.fn() }));
vi.mock('@/features/payments/redirect', () => ({ redirectTo: redirect.to }));

afterEach(() => {
  redirect.to.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const packageId = '3f2b1c4d-5e6f-4a1b-8c9d-0e1f2a3b4c5d';

const installment = (sequenceNumber: number, first: number, last: number, amount: number) => ({
  sequenceNumber,
  firstSessionNumber: first,
  lastSessionNumber: last,
  amount,
  services: [{ name: 'Chăm sóc da', sessionCount: last - first + 1 }],
});

const preview = {
  items: [
    {
      type: 'package',
      productId: packageId,
      productName: 'Gói 10 buổi',
      unitPrice: 3_500_000,
      discountAmount: 0,
      lineTotal: 3_500_000,
    },
  ],
  unavailableItems: [],
  subtotal: 3_500_000,
  discountTotal: 0,
  grandTotal: 3_500_000,
  promotion: null,
  promotionError: null,
  installmentOptions: [
    {
      installmentCount: 2,
      installments: [installment(1, 1, 5, 2_083_000), installment(2, 6, 10, 1_417_000)],
    },
    {
      installmentCount: 3,
      installments: [
        installment(1, 1, 4, 1_666_000),
        installment(2, 5, 7, 1_083_000),
        installment(3, 8, 10, 751_000),
      ],
    },
  ],
  installmentUnavailableReason: null,
};

function mockCheckout() {
  return mockApi({
    'POST /api/v1/auth/refresh': () => envelope(authResult('customer')),
    'POST /api/v1/me/orders/preview': () => envelope(preview),
    'POST /api/v1/me/orders': () => envelope({ id: 'o1', status: 'pending_payment' }, 201),
    'POST /api/v1/me/orders/o1/payments': () =>
      envelope(
        {
          paymentId: 'p1',
          paymentUrl: 'https://pay.test/DH1',
          expiresAtUtc: '2026-11-22T10:15:00Z',
          amount: 1_666_000,
          installmentSequenceNumber: 1,
        },
        201,
      ),
  });
}

test('a one-package order offers paying in installments and sends the chosen count', async () => {
  const fetcher = mockCheckout();
  renderApp(`/checkout?source=buy_now&packageId=${packageId}`);

  const three = await screen.findByRole('radio', { name: /Trả 3 đợt/ });
  expect(screen.getByRole('radio', { name: /Trả một lần/ })).toBeChecked();
  await userEvent.click(three);

  expect(await screen.findByText(/Đợt 1 · Hôm nay/)).toBeInTheDocument();
  expect(screen.getByText(/Buổi 1–4/)).toBeInTheDocument();
  expect(screen.getByText(/Đợt 3 · Khi cần/)).toBeInTheDocument();
  expect(screen.getByText('Thanh toán hôm nay · đợt 1/3')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Thanh toán đợt 1\/3/ }));

  await waitFor(() => expect(redirect.to).toHaveBeenCalledWith('https://pay.test/DH1'));
  const body = JSON.parse(String(callsTo(fetcher, '/api/v1/me/orders')[0]?.[1]?.body)) as Record<
    string,
    unknown
  >;
  expect(body).toMatchObject({
    source: 'buy_now',
    servicePackageId: packageId,
    installmentCount: 3,
  });
});

test('paying in full sends no installment count', async () => {
  const fetcher = mockCheckout();
  renderApp(`/checkout?source=buy_now&packageId=${packageId}`);

  await userEvent.click(await screen.findByRole('button', { name: /Thanh toán VNPay/ }));

  await waitFor(() => expect(redirect.to).toHaveBeenCalled());
  const body = JSON.parse(String(callsTo(fetcher, '/api/v1/me/orders')[0]?.[1]?.body)) as Record<
    string,
    unknown
  >;
  expect(body).not.toHaveProperty('installmentCount');
});
