using FluentAssertions;
using NhuNguyetSpa.Application.UseCases.Treatments;
using NhuNguyetSpa.Domain.Enums;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Treatments;

/// <summary>BR-TRT-06 and Q-37 (docs/specs/purchases-treatments.md; TRT-T22).</summary>
public sealed class TreatmentScopeTests
{
    private static readonly Guid Primary = Guid.NewGuid();
    private static readonly Guid Other = Guid.NewGuid();

    [Fact]
    public void OwnerSeesAndEditsAll()
    {
        TreatmentScope.CanView(isOwner: true, Other, null, assigned: false, assignedCanView: false).Should().BeTrue();
        TreatmentScope.CanEdit(isOwner: true, Other, Primary, TreatmentPlanStatus.Paused).Should().BeTrue();
    }

    [Fact]
    public void PrimaryStaffEdits()
    {
        TreatmentScope.CanView(isOwner: false, Primary, Primary, assigned: false, assignedCanView: false).Should().BeTrue();
        TreatmentScope.CanEdit(isOwner: false, Primary, Primary, TreatmentPlanStatus.InProgress).Should().BeTrue();
    }

    [Fact]
    public void AssignedStaffViewsOnly()
    {
        TreatmentScope.CanView(isOwner: false, Other, Primary, assigned: true, assignedCanView: true).Should().BeTrue();
        TreatmentScope.CanEdit(isOwner: false, Other, Primary, TreatmentPlanStatus.InProgress).Should().BeFalse();
    }

    [Fact]
    public void AssignedStaffHiddenWhenOptionOff()
    {
        TreatmentScope.CanView(isOwner: false, Other, Primary, assigned: true, assignedCanView: false).Should().BeFalse();
        TreatmentScope.CanView(isOwner: false, Other, null, assigned: false, assignedCanView: true).Should().BeFalse();
    }

    [Theory]
    [InlineData(TreatmentPlanStatus.Completed)]
    [InlineData(TreatmentPlanStatus.Cancelled)]
    public void NobodyEditsCompletedOrCancelled(TreatmentPlanStatus status)
    {
        TreatmentScope.CanEdit(isOwner: true, Other, Primary, status).Should().BeFalse();
        TreatmentScope.CanEdit(isOwner: false, Primary, Primary, status).Should().BeFalse();
    }
}
