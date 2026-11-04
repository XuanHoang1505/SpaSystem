using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.DTOs.Payments;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Payments;
using NhuNguyetSpa.Application.UseCases.Orders;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Payments;

/// <summary>UC-SPA-11 payment attempts and gateway results (docs/specs/orders.md, BR-ORD-05, 06, 10; Q-19, Q-20; book-now holds Q-28).</summary>
public sealed class PaymentService : IPaymentService
{
    private readonly IOrderRepository _orders;
    private readonly IPaymentRepository _payments;
    private readonly EntitlementIssuer _entitlementIssuer;
    private readonly IPaymentGateway _gateway;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<PaymentOptions> _options;
    private readonly ILogger<PaymentService> _logger;
    private readonly IAppointmentRepository _appointments;
    private readonly IOptions<BookingOptions> _bookingOptions;

    public PaymentService(
        IOrderRepository orders,
        IPaymentRepository payments,
        EntitlementIssuer entitlementIssuer,
        IPaymentGateway gateway,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<PaymentOptions> options,
        ILogger<PaymentService> logger,
        IAppointmentRepository appointments,
        IOptions<BookingOptions> bookingOptions)
    {
        _orders = orders;
        _payments = payments;
        _entitlementIssuer = entitlementIssuer;
        _gateway = gateway;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _logger = logger;
        _appointments = appointments;
        _bookingOptions = bookingOptions;
    }

    public async Task<OperationResult<PaymentAttemptDto>> CreateAttemptAsync(Guid orderId, CreatePaymentRequest request, string clientIp,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var customerId = _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized");
        var now = _clock.UtcNow;
        Payment payment = null!;
        // The order row lock serialises two clicks, so attempt numbers (and request codes) never collide.
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var order = await _orders.LockAsync(orderId, token);
            if (order == null || order.CustomerId != customerId)
                throw OrderErrors.OrderNotFound();
            if (!order.AcceptsPaymentAttempt(now))
                throw OrderErrors.OrderNotPayable();
            var max = _options.Value.MaxAttemptsPerOrder;
            if (order.Payments.Count >= max)
                throw PaymentErrors.AttemptsExceeded(max);

            payment = new Payment
            {
                OrderId = order.Id,
                Provider = _gateway.Provider,
                Amount = order.GrandTotal,
                Status = PaymentStatus.Pending,
                RequestCode = OrderCodeGenerator.PaymentRequestCode(order.Code, order.Payments.Count + 1),
                // The gateway stops taking money at the order's due time.
                ExpiresAtUtc = order.PaymentDueAtUtc,
            };
            payment.PaymentUrl = _gateway.CreatePaymentUrl(new PaymentUrlRequest(
                payment.RequestCode, payment.Amount, order.Code, now, payment.ExpiresAtUtc, clientIp, request.Client ?? PaymentClient.Web));
            await _payments.AddAsync(payment, token);
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
        return OperationResult<PaymentAttemptDto>.Success(new PaymentAttemptDto(payment.Id, payment.PaymentUrl!, payment.ExpiresAtUtc));
    }

    public async Task<PaymentCallbackOutcome> ProcessCallbackAsync(IReadOnlyDictionary<string, string> parameters, bool fromReturnUrl,
        CancellationToken cancellationToken)
    {
        var callback = _gateway.ParseCallback(parameters);
        if (!callback.IsSignatureValid)
            return new PaymentCallbackOutcome(PaymentCallbackStatus.InvalidSignature, null);
        if (string.IsNullOrEmpty(callback.RequestCode))
            return new PaymentCallbackOutcome(PaymentCallbackStatus.PaymentNotFound, null);
        var reference = await _payments.FindByRequestCodeAsync(callback.RequestCode, cancellationToken);
        if (reference == null)
            return new PaymentCallbackOutcome(PaymentCallbackStatus.PaymentNotFound, null);
        if (fromReturnUrl && !_gateway.ProcessesReturnUrl)
            return new PaymentCallbackOutcome(PaymentCallbackStatus.NotProcessed, reference.OrderId);

        var status = PaymentCallbackStatus.Confirmed;
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            // Locked so an IPN and a return URL for the same order are handled one after the other.
            var order = await _orders.LockAsync(reference.OrderId, token) ?? throw OrderErrors.OrderNotFound();
            var payment = order.Payments.Single(row => row.Id == reference.PaymentId);
            if (callback.Amount != payment.Amount)
            {
                status = PaymentCallbackStatus.InvalidAmount;
                return;
            }
            if (!payment.IsOpen)
            {
                status = PaymentCallbackStatus.AlreadyProcessed;
                return;
            }

            var now = _clock.UtcNow;
            if (!callback.IsSuccess)
            {
                payment.MarkFailed(callback.ProviderTransactionId);
                // Q-28: by default a failed attempt keeps the book-now hold so the customer can pay again before it runs out.
                if (_bookingOptions.Value.ReleaseHoldOnPaymentFailure)
                {
                    foreach (var hold in (await _appointments.GetHoldsForOrdersAsync([order.Id], token)).Where(hold => hold.Status == AppointmentStatus.Held))
                        hold.ExpireHold();
                }
            }
            else
            {
                payment.MarkSucceeded(callback.ProviderTransactionId, now);
                var paidByAnother = order.Payments.Any(row => row.Id != payment.Id && row.Status == PaymentStatus.Succeeded);
                if (order.Status == OrderStatus.PendingPayment || order.Status == OrderStatus.Expired && !paidByAnother)
                {
                    order.MarkPaid();
                    await _entitlementIssuer.IssueAsync(order, now, token);
                }
                else
                {
                    _logger.LogWarning("Payment {RequestCode} succeeded for order {OrderCode} in status {Status}; manual refund needed.",
                        payment.RequestCode, order.Code, order.Status);
                }
            }
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
        return new PaymentCallbackOutcome(status, reference.OrderId);
    }
}
