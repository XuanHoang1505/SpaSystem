using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Payments;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Payments;

/// <summary>
/// BR-ORD-03: pending orders past due + grace become expired, with their pending payments and book-now holds (BR-BKG-06). One batch
/// per call.
/// </summary>
public sealed class OrderExpiryService : IOrderExpiryService
{
    private readonly IOrderRepository _orders;
    private readonly IAppointmentRepository _appointments;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<OrderExpiryOptions> _options;

    public OrderExpiryService(IOrderRepository orders, IAppointmentRepository appointments, IUnitOfWork unitOfWork, IDateTimeProvider clock,
        IOptions<OrderExpiryOptions> options)
    {
        _orders = orders;
        _appointments = appointments;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _options = options;
    }

    public async Task<int> ExpireOverdueAsync(CancellationToken cancellationToken)
    {
        var options = _options.Value;
        var cutoff = _clock.UtcNow.AddMinutes(-options.GraceMinutes);
        var count = 0;
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var orders = await _orders.LockExpirableAsync(cutoff, options.BatchSize, token);
            if (orders.Count == 0)
                return;
            foreach (var order in orders)
            {
                order.Expire();
                foreach (var payment in order.Payments.Where(payment => payment.Status == PaymentStatus.Pending))
                    payment.Expire();
            }
            // BR-BKG-06 / A10: a book-now hold ends with its order.
            var holds = await _appointments.GetHoldsForOrdersAsync(orders.Select(order => order.Id).ToList(), token);
            foreach (var hold in holds.Where(hold => hold.Status == AppointmentStatus.Held))
                hold.ExpireHold();
            await _unitOfWork.SaveChangesAsync(token);
            count = orders.Count;
        }, cancellationToken);
        return count;
    }
}
