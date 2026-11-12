using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Orders;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Orders;

/// <summary>Shared cancel of an unpaid order (docs/specs/orders.md: BR-ORD-04, BR-ORD-12, Q-44, ORD-T32…T34, T38).</summary>
public sealed class OrderCancellationTests
{
    private static readonly DateTime Now = StaffTestDoubles.Now;
    private readonly IOrderRepository _orders = Substitute.For<IOrderRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IUnitOfWork _unitOfWork = OrderTestDoubles.UnitOfWork();
    private readonly Guid _customerId = Guid.NewGuid();

    private OrderCancellation Create(int blockMinutes = 0) => new(_orders, _appointments, _unitOfWork, StaffTestDoubles.Clock(),
        Options.Create(new OrderOptions { CancelBlockMinutesAfterPaymentStart = blockMinutes }));

    private Order Locked(OrderStatus status = OrderStatus.PendingPayment)
    {
        var order = new Order { Code = "DH261101ABCDEF", CustomerId = _customerId, Status = status, PaymentDueAtUtc = Now.AddMinutes(10) };
        _orders.LockAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _appointments.GetHoldsForOrdersAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns([]);
        return order;
    }

    [Fact]
    public async Task CancelsPendingOrderExpiresPendingPaymentsOnly()
    {
        var order = Locked();
        var failed = new Payment { Status = PaymentStatus.Failed, CreatedAtUtc = Now.AddMinutes(-8) };
        var pending = new Payment { Status = PaymentStatus.Pending, CreatedAtUtc = Now.AddMinutes(-3) };
        order.Payments.Add(failed);
        order.Payments.Add(pending);

        await Create().CancelAsync(order.Id, _customerId, "Đổi ý", CancellationToken.None);

        order.Status.Should().Be(OrderStatus.Cancelled);
        order.CancelledAtUtc.Should().Be(Now);
        failed.Status.Should().Be(PaymentStatus.Failed);
        pending.Status.Should().Be(PaymentStatus.Expired);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task TrimsReason()
    {
        var order = Locked();

        await Create().CancelAsync(order.Id, _customerId, "  Đổi ý  ", CancellationToken.None);

        order.CancellationReason.Should().Be("Đổi ý");
    }

    [Fact]
    public async Task CancelsStaleHeldAppointment()
    {
        var order = Locked();
        var stale = new Appointment { Status = AppointmentStatus.Held, HoldExpiresAtUtc = Now.AddMinutes(-1) };
        _appointments.GetHoldsForOrdersAsync(Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Single() == order.Id), Arg.Any<CancellationToken>())
            .Returns([stale]);

        await Create().CancelAsync(order.Id, _customerId, "Đổi ý", CancellationToken.None);

        stale.Status.Should().Be(AppointmentStatus.Cancelled);
        stale.CancellationReason.Should().Be("Hủy đơn hàng DH261101ABCDEF: Đổi ý");
        stale.CancelledAtUtc.Should().Be(Now);
    }

    [Fact]
    public async Task LeavesHoldExpiredAlone()
    {
        var order = Locked();
        var expired = new Appointment { Status = AppointmentStatus.HoldExpired };
        _appointments.GetHoldsForOrdersAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns([expired]);

        await Create().CancelAsync(order.Id, _customerId, "Đổi ý", CancellationToken.None);

        expired.Status.Should().Be(AppointmentStatus.HoldExpired);
        expired.CancellationReason.Should().BeNull();
    }

    [Fact]
    public async Task OtherCustomersOrderIsNotFound()
    {
        var order = Locked();

        var act = () => Create().CancelAsync(order.Id, Guid.NewGuid(), "Đổi ý", CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("order_not_found");
        order.Status.Should().Be(OrderStatus.PendingPayment);
    }

    [Fact]
    public async Task MissingOrderIsNotFound()
    {
        var act = () => Create().CancelAsync(Guid.NewGuid(), null, "Đổi ý", CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("order_not_found");
    }

    [Theory]
    [InlineData(OrderStatus.Paid)]
    [InlineData(OrderStatus.Cancelled)]
    [InlineData(OrderStatus.Expired)]
    public async Task NonPendingIsNotCancellable(OrderStatus status)
    {
        var order = Locked(status);

        var act = () => Create().CancelAsync(order.Id, _customerId, "Đổi ý", CancellationToken.None);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be("order_not_cancellable");
        await _unitOfWork.DidNotReceiveWithAnyArgs().SaveChangesAsync(default);
    }

    [Fact]
    public async Task CustomerBlockedThrowsPaymentInProgress()
    {
        var order = Locked();
        order.Payments.Add(new Payment { Status = PaymentStatus.Pending, CreatedAtUtc = Now.AddMinutes(-2) });

        var act = () => Create(blockMinutes: 5).CancelAsync(order.Id, _customerId, "Đổi ý", CancellationToken.None);

        var error = (await act.Should().ThrowAsync<ConflictException>()).Which;
        error.Code.Should().Be("order_payment_in_progress");
        error.Message.Should().Contain("sau 3 phút");
        order.Status.Should().Be(OrderStatus.PendingPayment);
    }

    [Fact]
    public async Task OwnerIgnoresBlock()
    {
        var order = Locked();
        order.Payments.Add(new Payment { Status = PaymentStatus.Pending, CreatedAtUtc = Now.AddMinutes(-2) });

        await Create(blockMinutes: 5).CancelAsync(order.Id, null, "Khách gọi điện hủy", CancellationToken.None);

        order.Status.Should().Be(OrderStatus.Cancelled);
    }
}
