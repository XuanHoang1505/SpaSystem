using FluentAssertions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests.Orders;

/// <summary>Cancelling an unpaid order (docs/specs/orders.md: BR-ORD-04, ORD-T29).</summary>
public sealed class OrderCancellationStateTests
{
    private static readonly DateTime Now = new(2026, 11, 1, 3, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void CancelFromPendingSetsStatusTimeAndReason()
    {
        var order = new Order { Status = OrderStatus.PendingPayment };

        order.Cancel("Đổi ý", Now);

        order.Status.Should().Be(OrderStatus.Cancelled);
        order.CancelledAtUtc.Should().Be(Now);
        order.CancellationReason.Should().Be("Đổi ý");
        order.IsCancellable.Should().BeFalse();
    }

    [Theory]
    [InlineData(OrderStatus.Paid)]
    [InlineData(OrderStatus.Cancelled)]
    [InlineData(OrderStatus.Expired)]
    public void CancelFromOtherStatusThrows(OrderStatus status)
    {
        var order = new Order { Status = status };

        order.IsCancellable.Should().BeFalse();
        FluentActions.Invoking(() => order.Cancel("Đổi ý", Now)).Should().Throw<InvalidOperationException>();
    }
}
