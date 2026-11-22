using FluentAssertions;
using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Domain.Tests.Orders;

/// <summary>INS-T01, INS-T02 and the order transitions of docs/specs/order-installments.md.</summary>
public sealed class InstallmentPlannerTests
{
    [Theory]
    [InlineData(10, 3, "1-4,5-7,8-10")]
    [InlineData(2, 2, "1-1,2-2")]
    [InlineData(7, 3, "1-3,4-5,6-7")]
    [InlineData(6, 1, "1-6")]
    public void SplitSessionsGivesTheRemainderToTheFirstInstallments(int sessions, int installments, string expected) =>
        string.Join(',', InstallmentPlanner.SplitSessions(sessions, installments).Select(range => $"{range.First}-{range.Last}"))
            .Should().Be(expected);

    [Theory]
    [InlineData(3, 2)]
    [InlineData(0, 2)]
    public void SplitSessionsRefusesMoreInstallmentsThanSessionsOrNone(int installments, int sessions) =>
        FluentActions.Invoking(() => InstallmentPlanner.SplitSessions(sessions, installments))
            .Should().Throw<ArgumentOutOfRangeException>();

    [Fact]
    public void PlanSharesTheTotalByListPriceOfTheSessions()
    {
        // 6 facials at 500 000 then 4 massages at 300 000; package 3 500 000 − 10% = 3 150 000 (spec example).
        var weights = Enumerable.Repeat(500_000m, 6).Concat(Enumerable.Repeat(300_000m, 4)).ToList();

        var plan = InstallmentPlanner.Plan(3_150_000, weights, 3, 1_000);

        plan.Should().Equal(
            new InstallmentShare(1, 1, 4, 1_500_000),
            new InstallmentShare(2, 5, 7, 975_000),
            new InstallmentShare(3, 8, 10, 675_000));
    }

    [Fact]
    public void PlanRoundsDownAndTheLastInstallmentTakesTheRest()
    {
        var plan = InstallmentPlanner.Plan(1_000_001, Enumerable.Repeat(100_000m, 3).ToList(), 3, 1_000);

        plan.Select(share => share.Amount).Should().Equal(333_000, 333_000, 334_001);
        plan.Sum(share => share.Amount).Should().Be(1_000_001);
    }

    [Fact]
    public void PlanWithOnlyFreeServicesSharesBySessionCount()
    {
        var plan = InstallmentPlanner.Plan(900_000, [0m, 0m, 0m], 3, 1_000);

        plan.Select(share => share.Amount).Should().Equal(300_000, 300_000, 300_000);
    }

    [Fact]
    public void FirstInstallmentMakesTheOrderPartiallyPaidAndTheLastOnePaid()
    {
        var order = InstallmentOrder(3);

        order.ApplyInstallmentPaid(order.NextPendingInstallment!, Now).Should().BeTrue();
        order.Status.Should().Be(OrderStatus.PartiallyPaid);
        order.PaidSessionCount.Should().Be(4);
        order.NextPendingInstallment!.SequenceNumber.Should().Be(2);

        order.ApplyInstallmentPaid(order.NextPendingInstallment!, Now).Should().BeFalse();
        order.ApplyInstallmentPaid(order.NextPendingInstallment!, Now).Should().BeFalse();
        order.Status.Should().Be(OrderStatus.Paid);
        order.PaidSessionCount.Should().Be(10);
        order.PaidAmount.Should().Be(order.GrandTotal);
        order.NextPendingInstallment.Should().BeNull();
    }

    [Fact]
    public void LateFirstInstallmentRevivesAnExpiredOrder()
    {
        var order = InstallmentOrder(2);
        order.Expire();

        order.ApplyInstallmentPaid(order.NextPendingInstallment!, Now).Should().BeTrue();

        order.Status.Should().Be(OrderStatus.PartiallyPaid);
    }

    [Fact]
    public void PaymentAttemptsFollowTheInstallmentsLeft()
    {
        var order = InstallmentOrder(2);
        order.AcceptsPaymentAttempt(Now).Should().BeTrue();
        order.ApplyInstallmentPaid(order.NextPendingInstallment!, Now);

        // A later installment has no due time of its own (BR-INS-07).
        order.AcceptsPaymentAttempt(Now.AddDays(30)).Should().BeTrue();

        order.CancelPendingInstallments();
        order.AcceptsPaymentAttempt(Now).Should().BeFalse();
        order.Installments.Select(installment => installment.Status).Should().Equal(InstallmentStatus.Paid, InstallmentStatus.Cancelled);
    }

    [Fact]
    public void CancellingAPendingOrderCancelsItsInstallmentsAndFullOrdersRefuseInstallments()
    {
        var order = InstallmentOrder(2);
        order.Cancel("Đổi ý", Now);
        order.Installments.Should().OnlyContain(installment => installment.Status == InstallmentStatus.Cancelled);

        var full = new Order { Code = "DH1", Status = OrderStatus.PendingPayment, PaymentPlan = PaymentPlan.Full };
        FluentActions.Invoking(() => full.ApplyInstallmentPaid(new OrderInstallment { OrderId = full.Id }, Now))
            .Should().Throw<InvalidOperationException>();
        FluentActions.Invoking(() => InstallmentOrder(2).MarkPaid()).Should().Throw<InvalidOperationException>();
    }

    private static readonly DateTime Now = new(2026, 11, 21, 3, 0, 0, DateTimeKind.Utc);

    private static Order InstallmentOrder(int installments)
    {
        var order = new Order
        {
            Code = "DH261121TEST01",
            Status = OrderStatus.PendingPayment,
            PaymentPlan = PaymentPlan.Installment,
            GrandTotal = 3_150_000,
            PaymentDueAtUtc = Now.AddMinutes(15),
        };
        var shares = InstallmentPlanner.Plan(order.GrandTotal, Enumerable.Repeat(1m, 10).ToList(), installments, 1_000);
        foreach (var share in shares)
            order.Installments.Add(new OrderInstallment
            {
                OrderId = order.Id,
                SequenceNumber = share.SequenceNumber,
                FirstSessionNumber = share.FirstSessionNumber,
                LastSessionNumber = share.LastSessionNumber,
                Amount = share.Amount,
                Status = InstallmentStatus.Pending,
            });
        return order;
    }
}
