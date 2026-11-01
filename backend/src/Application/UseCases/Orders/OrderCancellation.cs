using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>
/// Cancels an unpaid order for the customer (UC-SPA-12) or the owner (UC-SPA-13): BR-ORD-04, BR-ORD-12, Q-44. Takes the same
/// order row lock as the payment result handler and the expiry job, so a result and a cancel never interleave.
/// </summary>
public sealed class OrderCancellation
{
    private readonly IOrderRepository _orders;
    private readonly IAppointmentRepository _appointments;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<OrderOptions> _options;

    public OrderCancellation(IOrderRepository orders, IAppointmentRepository appointments, IUnitOfWork unitOfWork, IDateTimeProvider clock,
        IOptions<OrderOptions> options)
    {
        _orders = orders;
        _appointments = appointments;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _options = options;
    }

    /// <summary><paramref name="customerId"/> null means the owner: no ownership check and no Q-44 block.</summary>
    public async Task CancelAsync(Guid orderId, Guid? customerId, string reason, CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(reason);
        var trimmed = reason.Trim();
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var order = await _orders.LockAsync(orderId, token);
            if (order == null || customerId.HasValue && order.CustomerId != customerId.Value)
                throw OrderErrors.OrderNotFound();
            if (!order.IsCancellable)
                throw OrderErrors.NotCancellable();

            var now = _clock.UtcNow;
            if (customerId.HasValue)
            {
                var pending = order.Payments.Where(payment => payment.Status == PaymentStatus.Pending).ToList();
                var facts = new OrderActionFacts(order.Status, order.PaymentDueAtUtc, order.Payments.Count,
                    pending.Count == 0 ? null : pending.Max(payment => payment.CreatedAtUtc));
                if (OrderActionPolicy.CustomerCancelBlockedFor(facts, now, _options.Value.CancelBlockMinutesAfterPaymentStart) is { } wait)
                    throw OrderErrors.PaymentInProgress((int)Math.Ceiling(wait.TotalMinutes));
            }

            order.Cancel(trimmed, now);
            // Expired, not failed: a late result from the gateway is still recorded (BR-ORD-05), the order stays cancelled.
            foreach (var payment in order.Payments.Where(payment => payment.Status == PaymentStatus.Pending))
                payment.Expire();
            var holds = await _appointments.GetHoldsForOrdersAsync([order.Id], token);
            foreach (var hold in holds.Where(hold => hold.Status == AppointmentStatus.Held))
                hold.CancelHold($"Hủy đơn hàng {order.Code}: {trimmed}", now);
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
    }
}
