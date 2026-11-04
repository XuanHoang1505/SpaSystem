using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>Error codes of creating, reading and cancelling orders, UC-SPA-11, 12, 13 (docs/specs/orders.md).</summary>
public static class OrderErrors
{
    public const string CartEmptyCode = "cart_empty";
    public const string ItemsUnavailableCode = "order_items_unavailable";
    public const string AmountTooSmallCode = "order_amount_too_small";
    public const string OrderNotFoundCode = "order_not_found";
    public const string OrderNotPayableCode = "order_not_payable";
    public const string NotCancellableCode = "order_not_cancellable";
    public const string PaymentInProgressCode = "order_payment_in_progress";

    public static BusinessRuleException CartEmpty()
    {
        return new("Giỏ hàng đang trống.", CartEmptyCode);
    }

    public static BusinessRuleException ItemsUnavailable(IEnumerable<string> names)
    {
        return new($"Sản phẩm không còn mở bán: {string.Join(", ", names)}. Vui lòng xóa khỏi giỏ hàng.", ItemsUnavailableCode);
    }

    public static BusinessRuleException AmountTooSmall(decimal minAmount)
    {
        return new($"Tổng thanh toán phải từ {minAmount:N0} đ trở lên để thanh toán trực tuyến.", AmountTooSmallCode);
    }

    public static NotFoundException OrderNotFound()
    {
        return new("Không tìm thấy đơn hàng.", OrderNotFoundCode);
    }

    public static ConflictException OrderNotPayable()
    {
        return new("Đơn hàng không còn chờ thanh toán hoặc đã quá hạn thanh toán.", OrderNotPayableCode);
    }

    public static ConflictException NotCancellable()
    {
        return new("Chỉ hủy được đơn hàng đang chờ thanh toán.", NotCancellableCode);
    }

    public static ConflictException PaymentInProgress(int minutes)
    {
        return new($"Bạn vừa mở thanh toán cho đơn hàng này. Vui lòng thử hủy lại sau {minutes} phút hoặc liên hệ spa.", PaymentInProgressCode);
    }
}
