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
using NhuNguyetSpa.Application.Interfaces.Services.Notifications;
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
    private readonly IOptions<OrderOptions> _orderOptions;
    private readonly INotificationPublisher _notifications;

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
        IOptions<BookingOptions> bookingOptions,
        IOptions<OrderOptions> orderOptions,
        INotificationPublisher notifications)
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
        _orderOptions = orderOptions;
        _notifications = notifications;
    }

    public async Task<OperationResult<PaymentAttemptDto>> CreateAttemptAsync(Guid orderId, CreatePaymentRequest request, string clientIp,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var customerId = _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized");
        var now = _clock.UtcNow;
        Payment payment = null!;
        int? sequenceNumber = null;
        // The order row lock serialises two clicks, so attempt numbers (and request codes) never collide.
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var order = await _orders.LockAsync(orderId, token);
            if (order == null || order.CustomerId != customerId)
                throw OrderErrors.OrderNotFound();
            if (!order.AcceptsPaymentAttempt(now))
                throw OrderErrors.OrderNotPayable();
            // BR-INS-05: an installment order always pays its lowest pending installment.
            var installment = order.IsInstallmentPlan ? order.NextPendingInstallment : null;
            sequenceNumber = installment?.SequenceNumber;
            if (installment is not null && order.Status == OrderStatus.PartiallyPaid)
            {
                // BR-INS-07: later installments only while the package they unlock can still be used.
                var facts = (await _orders.GetInstallmentFactsAsync([order.Id], token)).GetValueOrDefault(order.Id);
                if (facts is null || !OrderActionPolicy.PackageUsable(facts, now))
                    throw OrderErrors.OrderNotPayable();
            }
            var max = _options.Value.MaxAttemptsPerOrder;
            var attempts = installment is null ? order.Payments.Count : order.Payments.Count(row => row.InstallmentId == installment.Id);
            if (attempts >= max)
                throw PaymentErrors.AttemptsExceeded(max);

            payment = new Payment
            {
                OrderId = order.Id,
                InstallmentId = installment?.Id,
                Provider = _gateway.Provider,
                Amount = installment?.Amount ?? order.GrandTotal,
                Status = PaymentStatus.Pending,
                RequestCode = OrderCodeGenerator.PaymentRequestCode(order.Code, order.Payments.Count + 1),
                // The gateway stops taking money at the order's due time; a later installment has none, so a fresh window.
                ExpiresAtUtc = order.Status == OrderStatus.PartiallyPaid
                    ? now.AddMinutes(_orderOptions.Value.PaymentTimeoutMinutes)
                    : order.PaymentDueAtUtc,
            };
            payment.PaymentUrl = _gateway.CreatePaymentUrl(new PaymentUrlRequest(
                payment.RequestCode, payment.Amount, order.Code, now, payment.ExpiresAtUtc, clientIp, request.Client ?? PaymentClient.Web));
            await _payments.AddAsync(payment, token);
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
        return OperationResult<PaymentAttemptDto>.Success(new PaymentAttemptDto(payment.Id, payment.PaymentUrl!, payment.ExpiresAtUtc,
            payment.Amount, sequenceNumber));
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
            else if (order.IsInstallmentPlan)
            {
                payment.MarkSucceeded(callback.ProviderTransactionId, now);
                await ApplyInstallmentAsync(order, payment, now, token);
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

    /// <summary>
    /// BR-INS-08: a success for a pending installment pays it. The first one issues the package (and NTF-E01), a later one sends
    /// NTF-E15. An installment already paid by another attempt, or cancelled, stays as it is and needs a manual refund (as Q-20).
    /// </summary>
    private async Task ApplyInstallmentAsync(Order order, Payment payment, DateTime now, CancellationToken cancellationToken)
    {
        var installment = order.Installments.SingleOrDefault(item => item.Id == payment.InstallmentId);
        if (installment is null || installment.Status != InstallmentStatus.Pending ||
            order.Status is not (OrderStatus.PendingPayment or OrderStatus.Expired or OrderStatus.PartiallyPaid))
        {
            _logger.LogWarning("Payment {RequestCode} succeeded for installment {Sequence} of order {OrderCode} ({Status}); manual refund needed.",
                payment.RequestCode, installment?.SequenceNumber, order.Code, installment?.Status);
            return;
        }
        if (order.ApplyInstallmentPaid(installment, now))
            await _entitlementIssuer.IssueAsync(order, now, cancellationToken);
        else
            await _notifications.InstallmentPaidAsync(order, installment, cancellationToken);
    }
}
