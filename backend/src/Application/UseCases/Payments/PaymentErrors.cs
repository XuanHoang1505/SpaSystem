using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Payments;

/// <summary>Error codes of payment attempts, UC-SPA-11 (docs/specs/orders.md).</summary>
public static class PaymentErrors
{
    public const string AttemptsExceededCode = "payment_attempts_exceeded";
    public const string GatewayUnavailableCode = "payment_gateway_unavailable";

    public static ConflictException AttemptsExceeded(int max)
    {
        return new($"Đơn hàng đã thử thanh toán {max} lần, vui lòng tạo đơn mới.", AttemptsExceededCode);
    }

    public static ServiceUnavailableException GatewayUnavailable()
    {
        return new("Cổng thanh toán đang tạm thời không khả dụng, vui lòng thử lại sau.", GatewayUnavailableCode);
    }
}
