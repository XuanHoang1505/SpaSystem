using FluentAssertions;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests.Orders;

/// <summary>Order and payment state transitions (docs/specs/orders.md: BR-ORD-03, BR-ORD-05, Q-20).</summary>
public sealed class OrderPaymentStateTests
{
    private static readonly DateTime Due = new(2026, 10, 27, 3, 15, 0, DateTimeKind.Utc);

    [Fact]
    public void PendingOrderCanBePaid()
    {
        var order = new Order { Status = OrderStatus.PendingPayment };

        order.MarkPaid();

        order.Status.Should().Be(OrderStatus.Paid);
    }

    [Fact]
    public void ExpiredOrderCanBePaid()
    {
        var order = new Order { Status = OrderStatus.Expired };

        order.MarkPaid();

        order.Status.Should().Be(OrderStatus.Paid);
    }

    [Theory]
    [InlineData(OrderStatus.Paid)]
    [InlineData(OrderStatus.Cancelled)]
    public void OrderCannotBePaidFrom(OrderStatus status)
    {
        var order = new Order { Status = status };

        FluentActions.Invoking(order.MarkPaid).Should().Throw<InvalidOperationException>();
        order.Status.Should().Be(status);
    }

    [Fact]
    public void OnlyPendingOrderExpires()
    {
        var pending = new Order { Status = OrderStatus.PendingPayment };
        pending.Expire();
        pending.Status.Should().Be(OrderStatus.Expired);

        var paid = new Order { Status = OrderStatus.Paid };
        FluentActions.Invoking(paid.Expire).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void AcceptsAttemptOnlyBeforeDue()
    {
        var order = new Order { Status = OrderStatus.PendingPayment, PaymentDueAtUtc = Due };

        order.AcceptsPaymentAttempt(Due.AddSeconds(-1)).Should().BeTrue();
        order.AcceptsPaymentAttempt(Due).Should().BeFalse();
        new Order { Status = OrderStatus.Paid, PaymentDueAtUtc = Due }.AcceptsPaymentAttempt(Due.AddMinutes(-5)).Should().BeFalse();
    }

    [Fact]
    public void ExpiredPaymentCanSucceed()
    {
        var payment = new Payment { Status = PaymentStatus.Expired };

        payment.IsOpen.Should().BeTrue();
        payment.MarkSucceeded("14123456", Due);

        payment.Status.Should().Be(PaymentStatus.Succeeded);
        payment.ProviderTransactionId.Should().Be("14123456");
        payment.PaidAtUtc.Should().Be(Due);
    }

    [Fact]
    public void PendingPaymentCanFail()
    {
        var payment = new Payment { Status = PaymentStatus.Pending };

        payment.MarkFailed("0");

        payment.Status.Should().Be(PaymentStatus.Failed);
        payment.PaidAtUtc.Should().BeNull();
    }

    [Fact]
    public void SucceededPaymentCannotFail()
    {
        var payment = new Payment { Status = PaymentStatus.Succeeded };

        payment.IsOpen.Should().BeFalse();
        FluentActions.Invoking(() => payment.MarkFailed(null)).Should().Throw<InvalidOperationException>();
        FluentActions.Invoking(() => payment.MarkSucceeded(null, Due)).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void OnlyPendingPaymentExpires()
    {
        var pending = new Payment { Status = PaymentStatus.Pending };
        pending.Expire();
        pending.Status.Should().Be(PaymentStatus.Expired);

        FluentActions.Invoking(new Payment { Status = PaymentStatus.Failed }.Expire).Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void PromotionChangesStatus()
    {
        var promotion = new Promotion { Status = PromotionStatus.Active };

        promotion.ChangeStatus(PromotionStatus.Stopped);

        promotion.Status.Should().Be(PromotionStatus.Stopped);
    }
}
