import type { OrderAppointment } from './bookings';
import type { CatalogItemType } from './catalog';
import type { SortDirection } from './index';

/** Cart, order and payment contracts (docs/specs/orders.md). Prices are whole VND, instants are ISO-8601 UTC. */
/** `partially_paid`: an installment order whose first installment is paid (docs/specs/order-installments.md). */
export type OrderStatus = 'pending_payment' | 'partially_paid' | 'paid' | 'expired' | 'cancelled';
/** `installment`: a one-package order paid in installments (Q-85). */
export type PaymentPlan = 'full' | 'installment';
/** `expired` is computed on read for an unpaid installment whose package can no longer be used. */
export type InstallmentStatus = 'pending' | 'paid' | 'cancelled' | 'expired';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'expired';
export type OrderSource = 'cart' | 'buy_now';
export type PaymentClient = 'web' | 'mobile';

export interface CartItem {
  id: string;
  type: CatalogItemType;
  productId: string;
  name: string;
  imageUrl: string | null;
  /** Price when the line was added (reference only). */
  unitPrice: number;
  /** Price the order will use. */
  currentPrice: number;
  priceChanged: boolean;
  isAvailable: boolean;
  addedAtUtc: string;
}

/** `totalAmount` sums the current price of available lines only. */
export interface Cart {
  items: readonly CartItem[];
  itemCount: number;
  totalAmount: number;
}

export interface AddCartItemRequest {
  spaServiceId?: string;
  servicePackageId?: string;
}

/** The whole cart (`cart`), or exactly one product (`buy_now`). */
export interface OrderRequest {
  source: OrderSource;
  spaServiceId?: string;
  servicePackageId?: string;
  promotionCode?: string;
  /** Pay a one-package order in this many installments; omitted = pay in full. */
  installmentCount?: number;
}

/** The services of an installment's sessions, in order (e.g. "Chăm sóc da × 2"). */
export interface InstallmentService {
  name: string;
  sessionCount: number;
}

/** An installment of a plan offered by the preview. */
export interface InstallmentPreview {
  sequenceNumber: number;
  firstSessionNumber: number;
  lastSessionNumber: number;
  amount: number;
  services: readonly InstallmentService[];
}

export interface InstallmentOption {
  installmentCount: number;
  installments: readonly InstallmentPreview[];
}

/** An installment of an order. */
export interface OrderInstallment {
  id: string;
  sequenceNumber: number;
  firstSessionNumber: number;
  lastSessionNumber: number;
  amount: number;
  status: InstallmentStatus;
  paidAtUtc: string | null;
}

/** The installment the next payment is for. */
export interface NextInstallment {
  id: string;
  sequenceNumber: number;
  amount: number;
  firstSessionNumber: number;
  lastSessionNumber: number;
}

export interface OrderPreviewItem {
  type: CatalogItemType;
  productId: string;
  productName: string;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface UnavailableItem {
  type: CatalogItemType;
  productId: string;
  name: string;
}

export interface AppliedPromotion {
  code: string;
  discountAmount: number;
}

export interface PromotionError {
  code: string;
  message: string;
}

export interface OrderPreview {
  items: readonly OrderPreviewItem[];
  unavailableItems: readonly UnavailableItem[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  promotion: AppliedPromotion | null;
  promotionError: PromotionError | null;
  /** Installment plans the order can take; empty with `installmentUnavailableReason` when it cannot. */
  installmentOptions: readonly InstallmentOption[];
  installmentUnavailableReason: PromotionError | null;
}

export interface OrderItem {
  id: string;
  type: CatalogItemType;
  productId: string;
  productName: string;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface OrderPayment {
  id: string;
  provider: string;
  amount: number;
  status: PaymentStatus;
  createdAtUtc: string;
  paidAtUtc: string | null;
  /** The installment this attempt paid, for an installment order. */
  installmentSequenceNumber: number | null;
}

/** `isPayable`: a new payment can start now (the order, or the next installment of an installment order). */
export interface OrderDetail {
  id: string;
  code: string;
  status: OrderStatus;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentDueAtUtc: string;
  createdAtUtc: string;
  isPayable: boolean;
  items: readonly OrderItem[];
  payments: readonly OrderPayment[];
  promotion: AppliedPromotion | null;
  canCancel: boolean;
  cancelledAtUtc: string | null;
  cancellationReason: string | null;
  /** The slot held by a book-now order (UC-SPA-15); null for other orders. */
  appointment: OrderAppointment | null;
  paymentPlan: PaymentPlan;
  /** Empty for an order paid in full. */
  installments: readonly OrderInstallment[];
  paidAmount: number;
  remainingAmount: number;
  nextInstallment: NextInstallment | null;
}

/** A row of `GET /me/orders` (UC-SPA-12). `isPayable` / `canCancel` come from the API; the client never recomputes them. */
export interface MyOrderListItem {
  id: string;
  code: string;
  status: OrderStatus;
  createdAtUtc: string;
  paymentDueAtUtc: string;
  grandTotal: number;
  itemCount: number;
  productNames: readonly string[];
  isPayable: boolean;
  canCancel: boolean;
  paymentPlan: PaymentPlan;
  paidAmount: number;
  /** What the next payment costs while the order is pending or partially paid. */
  nextInstallmentAmount: number | null;
}

/** Filters of `GET /me/orders`: one status, Vietnam dates (`yyyy-MM-dd`) of creation, paging. */
export interface OrderListParams {
  status?: OrderStatus;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

/** The customer of an order row (UC-SPA-13). */
export interface OrderCustomerSummary {
  id: string;
  fullName: string;
  phoneNumber: string;
}

/** The customer of an owner's order detail. */
export interface OrderCustomer extends OrderCustomerSummary {
  email: string;
}

/** A row of the owner's `GET /orders`; `latestPaymentStatus` is that of the newest attempt, if any. */
export interface OrderListItem {
  id: string;
  code: string;
  status: OrderStatus;
  createdAtUtc: string;
  paymentDueAtUtc: string;
  grandTotal: number;
  itemCount: number;
  customer: OrderCustomerSummary;
  paymentCount: number;
  latestPaymentStatus: PaymentStatus | null;
  promotionCode: string | null;
  paymentPlan: PaymentPlan;
  paidAmount: number;
}

/** A payment attempt as the owner sees it, with the gateway references. */
export interface OwnerOrderPayment {
  id: string;
  provider: string;
  amount: number;
  status: PaymentStatus;
  requestCode: string;
  providerTransactionId: string | null;
  createdAtUtc: string;
  expiresAtUtc: string;
  paidAtUtc: string | null;
  installmentSequenceNumber: number | null;
}

/** `GET /orders/{id}`: the customer's order detail plus the customer and gateway references. */
export type OwnerOrderDetail = Omit<OrderDetail, 'payments'> & {
  customer: OrderCustomer;
  payments: readonly OwnerOrderPayment[];
};

export type OrderSortBy = 'createdAtUtc' | 'grandTotal';

/** Filters of the owner's `GET /orders`: `search` is an order code or a customer's name/phone/email. */
export type OrderSearchParams = OrderListParams & {
  search?: string;
  sortBy?: OrderSortBy;
  sortDirection?: SortDirection;
};

export interface PaymentAttempt {
  paymentId: string;
  paymentUrl: string;
  expiresAtUtc: string;
  amount: number;
  /** The installment this attempt pays; null for an order paid in full. */
  installmentSequenceNumber: number | null;
}
