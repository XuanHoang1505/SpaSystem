import { ApiClientError, orderErrorCodes } from '@spa/api-client';

const messages: Record<string, string> = {
  [orderErrorCodes.cartFull]: 'Giỏ hàng đã đầy (tối đa 20 sản phẩm).',
  [orderErrorCodes.cartItemNotFound]: 'Sản phẩm không còn trong giỏ.',
  [orderErrorCodes.cartEmpty]: 'Giỏ hàng đang trống.',
  [orderErrorCodes.orderItemsUnavailable]: 'Có sản phẩm không còn bán.',
  [orderErrorCodes.promotionInvalid]: 'Mã khuyến mãi không hợp lệ.',
  [orderErrorCodes.promotionNotApplicable]: 'Mã khuyến mãi không áp dụng được cho đơn này.',
  [orderErrorCodes.orderAmountTooSmall]: 'Giá trị thanh toán tối thiểu là 5.000 đ.',
  [orderErrorCodes.orderNotFound]: 'Không tìm thấy đơn hàng.',
  [orderErrorCodes.orderNotPayable]: 'Đơn hàng đã hết hạn hoặc không còn chờ thanh toán.',
  [orderErrorCodes.paymentAttemptsExceeded]:
    'Bạn đã thử thanh toán quá số lần cho phép với đơn này.',
  [orderErrorCodes.paymentGatewayUnavailable]:
    'Cổng thanh toán tạm thời không khả dụng, vui lòng thử lại sau.',
  [orderErrorCodes.orderNotCancellable]: 'Đơn hàng không còn có thể hủy.',
  [orderErrorCodes.orderPaymentInProgress]: 'Đơn hàng đang được thanh toán, chưa thể hủy.',
  [orderErrorCodes.validationError]: 'Dữ liệu không hợp lệ.',
};

/** First `errors[].code` of an API error (never the message). */
export const orderErrorCode = (error: unknown): string | undefined =>
  error instanceof ApiClientError ? error.errors[0]?.code : undefined;

/** Vietnamese copy for a cart/order/payment error, chosen by code, then by connection state. */
export function orderErrorMessage(error: unknown): string {
  const code = orderErrorCode(error);
  if (code && messages[code]) return messages[code];
  if (error instanceof ApiClientError && error.status === 0) return 'Không kết nối được máy chủ.';
  return 'Đã có lỗi xảy ra, vui lòng thử lại.';
}
