using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Purchases;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Purchases;

/// <summary>BR-TRT-04: effective status computed when read (docs/specs/purchases-treatments.md, Q-32).</summary>
public sealed class PurchaseStatusTests
{
    private static readonly DateTime Now = new(2026, 10, 30, 3, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void AvailableEntitlementPastExpiryIsExpired()
    {
        PurchaseStatus.Effective(EntitlementStatus.Available, Now, Now).Should().Be(EntitlementStatus.Expired);
        PurchaseStatus.Effective(EntitlementStatus.Available, Now.AddMinutes(1), Now).Should().Be(EntitlementStatus.Available);
    }

    [Fact]
    public void NullExpiryNeverExpires()
    {
        PurchaseStatus.Effective(EntitlementStatus.Available, null, Now).Should().Be(EntitlementStatus.Available);
        PurchaseStatus.Effective(CustomerPackageStatus.Active, null, Now).Should().Be(CustomerPackageStatus.Active);
    }

    [Fact]
    public void UsedOrBookedStayAsStored()
    {
        PurchaseStatus.Effective(EntitlementStatus.Used, Now.AddDays(-1), Now).Should().Be(EntitlementStatus.Used);
        PurchaseStatus.Effective(EntitlementStatus.Booked, Now.AddDays(-1), Now).Should().Be(EntitlementStatus.Booked);
    }

    [Fact]
    public void ActivePackagePastExpiryIsExpired()
    {
        PurchaseStatus.Effective(CustomerPackageStatus.Active, Now.AddDays(-1), Now).Should().Be(CustomerPackageStatus.Expired);
        PurchaseStatus.Effective(CustomerPackageStatus.Completed, Now.AddDays(-1), Now).Should().Be(CustomerPackageStatus.Completed);
    }
}
