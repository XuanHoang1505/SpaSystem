using FluentAssertions;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.UseCases.Orders;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Orders;

/// <summary>Which actions an order offers (docs/specs/orders.md: BR-ORD-03, BR-ORD-04, BR-ORD-10, Q-44, ORD-T31).</summary>
public sealed class OrderActionPolicyTests
{
    private static readonly DateTime Now = new(2026, 11, 1, 3, 0, 0, DateTimeKind.Utc);

    private static OrderActionFacts Facts(OrderStatus status, int dueInMinutes = 10, int payments = 0, DateTime? latestPending = null) =>
        new(status, Now.AddMinutes(dueInMinutes), payments, latestPending);

    [Fact]
    public void PayableMatchesExistingRule()
    {
        OrderActionPolicy.IsPayable(Facts(OrderStatus.PendingPayment), Now, 5).Should().BeTrue();
        OrderActionPolicy.IsPayable(Facts(OrderStatus.PendingPayment, dueInMinutes: 0), Now, 5).Should().BeFalse();
        OrderActionPolicy.IsPayable(Facts(OrderStatus.PendingPayment, payments: 5), Now, 5).Should().BeFalse();
        OrderActionPolicy.IsPayable(Facts(OrderStatus.Paid), Now, 5).Should().BeFalse();
    }

    [Fact]
    public void CustomerBlockedWithinWindow()
    {
        var recent = Facts(OrderStatus.PendingPayment, payments: 1, latestPending: Now.AddMinutes(-2));
        var older = Facts(OrderStatus.PendingPayment, payments: 1, latestPending: Now.AddMinutes(-6));

        OrderActionPolicy.CustomerCancelBlockedFor(recent, Now, 5).Should().Be(TimeSpan.FromMinutes(3));
        OrderActionPolicy.CustomerCanCancel(recent, Now, 5).Should().BeFalse();
        OrderActionPolicy.CustomerCancelBlockedFor(older, Now, 5).Should().BeNull();
        OrderActionPolicy.CustomerCanCancel(older, Now, 5).Should().BeTrue();
    }

    [Fact]
    public void ZeroBlockNeverBlocks()
    {
        var justStarted = Facts(OrderStatus.PendingPayment, payments: 1, latestPending: Now);

        OrderActionPolicy.CustomerCancelBlockedFor(justStarted, Now, 0).Should().BeNull();
        OrderActionPolicy.CustomerCanCancel(justStarted, Now, 0).Should().BeTrue();
    }

    [Fact]
    public void OverduePendingOrderIsStillCancellable()
    {
        OrderActionPolicy.CustomerCanCancel(Facts(OrderStatus.PendingPayment, dueInMinutes: -3), Now, 0).Should().BeTrue();
    }

    [Theory]
    [InlineData(OrderStatus.PendingPayment, true)]
    [InlineData(OrderStatus.Paid, false)]
    [InlineData(OrderStatus.Cancelled, false)]
    [InlineData(OrderStatus.Expired, false)]
    public void OwnerCanCancelOnlyPending(OrderStatus status, bool expected)
    {
        OrderActionPolicy.OwnerCanCancel(status).Should().Be(expected);
        OrderActionPolicy.CustomerCanCancel(Facts(status), Now, 0).Should().Be(expected);
    }

    [Fact]
    public void FactsTakeLatestPendingPayment()
    {
        var payments = new[]
        {
            new OrderPaymentDto(Guid.NewGuid(), "vnpay", 1, PaymentStatus.Pending, Now.AddMinutes(-9), null),
            new OrderPaymentDto(Guid.NewGuid(), "vnpay", 1, PaymentStatus.Pending, Now.AddMinutes(-4), null),
            new OrderPaymentDto(Guid.NewGuid(), "vnpay", 1, PaymentStatus.Failed, Now.AddMinutes(-1), null),
        };

        var facts = OrderActionFacts.From(OrderStatus.PendingPayment, Now, payments);

        facts.PaymentCount.Should().Be(3);
        facts.LatestPendingPaymentAtUtc.Should().Be(Now.AddMinutes(-4));
    }
}
