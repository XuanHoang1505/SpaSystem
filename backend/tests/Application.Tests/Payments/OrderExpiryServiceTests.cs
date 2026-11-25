using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Orders;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Payments;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Payments;

/// <summary>OrderExpiryJob's work (docs/specs/orders.md: BR-ORD-03; ORD-T23). Grace 5 minutes, batch 200.</summary>
public sealed class OrderExpiryServiceTests
{
    private readonly IOrderRepository _orders = Substitute.For<IOrderRepository>();
    private readonly IUnitOfWork _unitOfWork = OrderTestDoubles.UnitOfWork();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();

    public OrderExpiryServiceTests()
    {
        _orders.LockWithStalePaymentsAsync(Arg.Any<DateTime>(), Arg.Any<int>(), Arg.Any<CancellationToken>()).Returns([]);
    }

    private OrderExpiryService Create() =>
        new(_orders, _appointments, _unitOfWork, StaffTestDoubles.Clock(), Options.Create(new OrderExpiryOptions()));

    [Fact]
    public async Task ExpiresStaleInstallmentPaymentsButKeepsTheOrder()
    {
        var cutoff = StaffTestDoubles.Now.AddMinutes(-5);
        var order = new Order { Status = OrderStatus.PartiallyPaid };
        var stale = new Payment { Status = PaymentStatus.Pending, ExpiresAtUtc = cutoff.AddMinutes(-1) };
        var stillOpen = new Payment { Status = PaymentStatus.Pending, ExpiresAtUtc = cutoff.AddMinutes(10) };
        var paid = new Payment { Status = PaymentStatus.Succeeded, ExpiresAtUtc = cutoff.AddDays(-1) };
        order.Payments.Add(stale);
        order.Payments.Add(stillOpen);
        order.Payments.Add(paid);
        _orders.LockExpirableAsync(Arg.Any<DateTime>(), Arg.Any<int>(), Arg.Any<CancellationToken>()).Returns([]);
        _orders.LockWithStalePaymentsAsync(cutoff, 200, Arg.Any<CancellationToken>()).Returns([order]);

        var count = await Create().ExpireOverdueAsync(CancellationToken.None);

        count.Should().Be(0, "no order expired");
        order.Status.Should().Be(OrderStatus.PartiallyPaid);
        stale.Status.Should().Be(PaymentStatus.Expired);
        stillOpen.Status.Should().Be(PaymentStatus.Pending);
        paid.Status.Should().Be(PaymentStatus.Succeeded);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExpiresLockedOrdersAndTheirPendingPayments()
    {
        var order = new Order { Status = OrderStatus.PendingPayment };
        var pending = new Payment { Status = PaymentStatus.Pending };
        var failed = new Payment { Status = PaymentStatus.Failed };
        order.Payments.Add(pending);
        order.Payments.Add(failed);
        _orders.LockExpirableAsync(StaffTestDoubles.Now.AddMinutes(-5), 200, Arg.Any<CancellationToken>()).Returns([order]);

        var count = await Create().ExpireOverdueAsync(CancellationToken.None);

        count.Should().Be(1);
        order.Status.Should().Be(OrderStatus.Expired);
        pending.Status.Should().Be(PaymentStatus.Expired);
        failed.Status.Should().Be(PaymentStatus.Failed);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task NothingDueSavesNothing()
    {
        _orders.LockExpirableAsync(Arg.Any<DateTime>(), Arg.Any<int>(), Arg.Any<CancellationToken>()).Returns([]);

        (await Create().ExpireOverdueAsync(CancellationToken.None)).Should().Be(0);
        await _unitOfWork.DidNotReceiveWithAnyArgs().SaveChangesAsync(default);
    }

    [Fact]
    public async Task ExpiryExpiresHoldsOfExpiredOrders()
    {
        var order = new Order { Status = OrderStatus.PendingPayment };
        var held = new Appointment { Status = AppointmentStatus.Held };
        var alreadyExpired = new Appointment { Status = AppointmentStatus.HoldExpired };
        _orders.LockExpirableAsync(Arg.Any<DateTime>(), Arg.Any<int>(), Arg.Any<CancellationToken>()).Returns([order]);
        _appointments.GetHoldsForOrdersAsync(Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Single() == order.Id), Arg.Any<CancellationToken>())
            .Returns([held, alreadyExpired]);

        await Create().ExpireOverdueAsync(CancellationToken.None);

        held.Status.Should().Be(AppointmentStatus.HoldExpired);
        alreadyExpired.Status.Should().Be(AppointmentStatus.HoldExpired);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
