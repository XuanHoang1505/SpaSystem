import type { OrderAppointment } from './bookings';
import type { CatalogItemType } from './catalog';

/** Cart, order and payment contracts (docs/specs/orders.md). Prices are whole VND, instants are ISO-8601 UTC. */
export type OrderStatus = 'pending_payment' | 'paid' | 'expired' | 'cancelled';
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
}

/** `isPayable`: pending, before the due time and below the attempt limit. */
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
}

/** Filters of `GET /me/orders`: one status, Vietnam dates (`yyyy-MM-dd`) of creation, paging. */
export interface OrderListParams {
  status?: OrderStatus;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface PaymentAttempt {
  paymentId: string;
  paymentUrl: string;
  expiresAtUtc: string;
}
