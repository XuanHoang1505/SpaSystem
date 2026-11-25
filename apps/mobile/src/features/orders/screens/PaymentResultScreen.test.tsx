import { fireEvent, render, screen } from '@testing-library/react-native';
import type { OrderDetail, OrderPayment } from '@spa/shared-types';
import { isWaiting, paidInstallment } from '../hooks/useOrderPolling';
import { PaymentResultScreen } from './PaymentResultScreen';

const mockReplace = jest.fn();
let mockPolling: Record<string, unknown> = {};

jest.mock('expo-router', () => ({
  router: { replace: (path: string) => mockReplace(path) },
  useLocalSearchParams: () => ({ orderId: 'order-1' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../hooks/useOrderPolling', () => {
  const actual = jest.requireActual('../hooks/useOrderPolling');
  return { ...actual, useOrderPolling: () => mockPolling };
});

const payment = (overrides: Partial<OrderPayment>): OrderPayment => ({
  id: 'pay-1',
  provider: 'vnpay',
  amount: 1_500_000,
  status: 'succeeded',
  createdAtUtc: '2026-11-20T03:00:00Z',
  paidAtUtc: '2026-11-20T03:01:00Z',
  installmentSequenceNumber: 1,
  ...overrides,
});

const installmentOrder = (overrides: Partial<OrderDetail>): OrderDetail =>
  ({
    id: 'order-1',
    code: 'DH001',
    status: 'partially_paid',
    paymentPlan: 'installment',
    grandTotal: 3_500_000,
    paidAmount: 1_500_000,
    remainingAmount: 2_000_000,
    paymentDueAtUtc: '2026-11-20T03:15:00Z',
    isPayable: true,
    canCancel: false,
    items: [
      {
        id: 'item-1',
        type: 'package',
        productId: 'pkg-1',
        productName: 'Gói chăm sóc da 10 buổi',
        lineTotal: 3_500_000,
      },
    ],
    installments: [{}, {}, {}],
    nextInstallment: {
      id: 'ins-2',
      sequenceNumber: 2,
      amount: 1_000_000,
      firstSessionNumber: 5,
      lastSessionNumber: 7,
    },
    payments: [payment({})],
    appointment: null,
    ...overrides,
  }) as unknown as OrderDetail;

const show = (order: OrderDetail, extra: Record<string, unknown> = {}) => {
  mockPolling = {
    order,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    isPolling: false,
    isPollingTimeout: false,
    isWaiting: isWaiting(order),
    ...extra,
  };
  render(<PaymentResultScreen />);
};

beforeEach(() => mockReplace.mockClear());

describe('order polling helpers', () => {
  it('waits for a later installment of a partially paid order', () => {
    const order = installmentOrder({
      payments: [
        payment({}),
        payment({
          id: 'pay-2',
          status: 'pending',
          paidAtUtc: null,
          createdAtUtc: '2026-11-21T03:00:00Z',
        }),
      ],
    });
    expect(isWaiting(order)).toBe(true);
    expect(paidInstallment(order)).toBeNull();
  });

  it('knows which installment was just paid', () => {
    expect(isWaiting(installmentOrder({}))).toBe(false);
    expect(paidInstallment(installmentOrder({}))).toBe(1);
    expect(paidInstallment(installmentOrder({ status: 'paid' }))).toBeNull();
  });
});

describe('PaymentResultScreen with an installment order', () => {
  it('shows the paid installment and lets the customer book the paid sessions', () => {
    show(installmentOrder({}));

    expect(screen.getByText('Đã thanh toán đợt 1/3')).toBeOnTheScreen();
    expect(screen.getByText(/Bạn đặt lịch được đến buổi 4/)).toBeOnTheScreen();
    expect(screen.queryByText('Đang chờ thanh toán')).toBeNull();
    fireEvent.press(screen.getByText('Đặt lịch các buổi đã trả'));
    expect(mockReplace).toHaveBeenCalledWith('/(customer)/packages');
  });

  it('offers to retry a failed later installment without an old hold time', () => {
    show(
      installmentOrder({
        payments: [
          payment({}),
          payment({
            id: 'pay-2',
            status: 'failed',
            paidAtUtc: null,
            installmentSequenceNumber: 2,
            createdAtUtc: '2026-11-21T03:00:00Z',
          }),
        ],
      }),
    );

    expect(screen.getByText('Giao dịch chưa hoàn tất')).toBeOnTheScreen();
    expect(screen.getByText(/thanh toán lại đợt này/)).toBeOnTheScreen();
    expect(screen.queryByText(/Đơn hàng được giữ đến/)).toBeNull();
    fireEvent.press(screen.getByText('Thử lại thanh toán đợt'));
    expect(mockReplace).toHaveBeenCalledWith('/my-orders/order-1');
  });
});
