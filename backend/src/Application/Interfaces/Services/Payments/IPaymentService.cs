using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Payments;

namespace NhuNguyetSpa.Application.Interfaces.Services.Payments;

/// <summary>UC-SPA-11: payment attempts and gateway results (docs/specs/orders.md, BR-ORD-05, 10).</summary>
public interface IPaymentService
{
    Task<OperationResult<PaymentAttemptDto>> CreateAttemptAsync(Guid orderId, CreatePaymentRequest request, string clientIp,
        CancellationToken cancellationToken);

    /// <summary>One handler for IPN and return URL; never throws for bad gateway input.</summary>
    Task<PaymentCallbackOutcome> ProcessCallbackAsync(IReadOnlyDictionary<string, string> parameters, bool fromReturnUrl,
        CancellationToken cancellationToken);
}

/// <summary>Expires unpaid orders past their due time plus grace (BR-ORD-03); run by OrderExpiryJob.</summary>
public interface IOrderExpiryService
{
    Task<int> ExpireOverdueAsync(CancellationToken cancellationToken);
}
