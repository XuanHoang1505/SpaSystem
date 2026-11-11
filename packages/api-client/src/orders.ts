import type {
  AddCartItemRequest,
  ApiResponse,
  Cart,
  MyOrderListItem,
  OrderDetail,
  OrderListParams,
  OrderListItem,
  OrderPreview,
  OrderRequest,
  OrderSearchParams,
  OwnerOrderDetail,
  PagedResponse,
  PaymentAttempt,
  PaymentClient,
} from '@spa/shared-types';
import type { ApiClient } from './index';

const base = '/api/v1/me';

/** Error codes of the cart, order and payment endpoints (docs/specs/orders.md); branch on these, never on the message. */
export const orderErrorCodes = {
  cartItemExists: 'cart_item_exists',
  cartFull: 'cart_full',
  cartItemNotFound: 'cart_item_not_found',
  cartEmpty: 'cart_empty',
  orderItemsUnavailable: 'order_items_unavailable',
  promotionInvalid: 'promotion_invalid',
  promotionNotApplicable: 'promotion_not_applicable',
  orderAmountTooSmall: 'order_amount_too_small',
  orderNotFound: 'order_not_found',
  orderNotPayable: 'order_not_payable',
  orderNotCancellable: 'order_not_cancellable',
  orderPaymentInProgress: 'order_payment_in_progress',
  paymentAttemptsExceeded: 'payment_attempts_exceeded',
  paymentGatewayUnavailable: 'payment_gateway_unavailable',
  serviceNotFound: 'service_not_found',
  packageNotFound: 'package_not_found',
  validationError: 'validation_error',
} as const;

/** UC-SPA-10, 11: the signed-in customer's cart, orders and payment attempts. */
export class OrdersApi {
  constructor(private readonly client: ApiClient) {}

  getCart(signal?: AbortSignal) {
    return this.client.get<ApiResponse<Cart>>(`${base}/cart`, { signal });
  }

  addCartItem(body: AddCartItemRequest) {
    return this.client.post<AddCartItemRequest, ApiResponse<Cart>>(`${base}/cart/items`, body);
  }

  removeCartItem(itemId: string) {
    return this.client.delete<ApiResponse<Cart>>(
      `${base}/cart/items/${encodeURIComponent(itemId)}`,
    );
  }

  previewOrder(request: OrderRequest, signal?: AbortSignal) {
    return this.client.post<OrderRequest, ApiResponse<OrderPreview>>(
      `${base}/orders/preview`,
      request,
      { signal },
    );
  }

  /** The same key returns the earlier order instead of a new one (BR-ORD-08). */
  createOrder(request: OrderRequest, idempotencyKey: string) {
    return this.client.post<OrderRequest, ApiResponse<OrderDetail>>(`${base}/orders`, request, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  getOrder(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<OrderDetail>>(`${base}/orders/${encodeURIComponent(id)}`, {
      signal,
    });
  }

  listOrders(params: OrderListParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<MyOrderListItem>>>(`${base}/orders`, {
      query: { ...params },
      signal,
    });
  }

  /** Only a `pending_payment` order can be cancelled; the reason is required (1-500 characters, Q-43). */
  cancelOrder(id: string, reason: string) {
    return this.client.post<{ reason: string }, ApiResponse<OrderDetail>>(
      `${base}/orders/${encodeURIComponent(id)}/cancel`,
      { reason },
    );
  }

  createPayment(orderId: string, client: PaymentClient) {
    return this.client.post<{ client: PaymentClient }, ApiResponse<PaymentAttempt>>(
      `${base}/orders/${encodeURIComponent(orderId)}/payments`,
      { client },
    );
  }
}

const managementBase = '/api/v1/orders';

/** UC-SPA-13: the owner's order search, detail and cancellation (`order.manage`). */
export class OrderManagementApi {
  constructor(private readonly client: ApiClient) {}

  listOrders(params: OrderSearchParams, signal?: AbortSignal) {
    return this.client.get<ApiResponse<PagedResponse<OrderListItem>>>(managementBase, {
      query: { ...params },
      signal,
    });
  }

  getOrder(id: string, signal?: AbortSignal) {
    return this.client.get<ApiResponse<OwnerOrderDetail>>(
      `${managementBase}/${encodeURIComponent(id)}`,
      { signal },
    );
  }

  /** Only a `pending_payment` order can be cancelled; the reason is required (1-500 characters, Q-43). */
  cancelOrder(id: string, reason: string) {
    return this.client.post<{ reason: string }, ApiResponse<OwnerOrderDetail>>(
      `${managementBase}/${encodeURIComponent(id)}/cancel`,
      { reason },
    );
  }
}

export const ordersQueryKeys = {
  all: ['orders'] as const,
  cart: ['orders', 'cart'] as const,
  list: (params: OrderListParams) => ['orders', 'list', params] as const,
  preview: (request: OrderRequest) => ['orders', 'preview', request] as const,
  order: (id: string) => ['orders', 'detail', id] as const,
  /** Owner keys live under `['orders', 'manage']`, apart from the customer's order detail. */
  managedLists: ['orders', 'manage', 'list'] as const,
  managedList: (params: OrderSearchParams) => ['orders', 'manage', 'list', params] as const,
  managedOrder: (id: string) => ['orders', 'manage', 'detail', id] as const,
};
