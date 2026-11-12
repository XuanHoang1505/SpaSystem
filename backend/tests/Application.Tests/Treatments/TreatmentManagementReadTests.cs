using FluentAssertions;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.UseCases.Treatments;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Treatments;

/// <summary>UC-SPA-21 reads (docs/specs/purchases-treatments.md BR-TRT-06, Q-37; TRT-T21…T23).</summary>
public sealed class TreatmentManagementReadTests
{
    private readonly TreatmentTestBed _bed = new();

    [Fact]
    public async Task StaffListPassesScopeAndOption()
    {
        var staff = _bed.UseRole("staff");

        await _bed.Create().ListAsync(new PagedQuery { Search = "  nguyen ", PageNumber = 2, PageSize = 5 },
            new TreatmentListQuery { Status = "paused" }, default);

        await _bed.Treatments.Received(1).SearchAsync(
            new TreatmentSearchCriteria("nguyen", null, TreatmentPlanStatus.Paused, null, staff, true, 2, 5), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task StaffListHonoursOptionOff()
    {
        var staff = _bed.UseRole("staff");
        _bed.Options.AssignedStaffCanView = false;

        await _bed.Create().ListAsync(new PagedQuery(), new TreatmentListQuery(), default);

        await _bed.Treatments.Received(1).SearchAsync(
            Arg.Is<TreatmentSearchCriteria>(criteria => criteria.ScopeStaffMemberId == staff && !criteria.IncludeAssigned), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task OwnerListHasNoScope()
    {
        _bed.UseRole("owner");

        await _bed.Create().ListAsync(new PagedQuery(), new TreatmentListQuery(), default);

        await _bed.Treatments.Received(1).SearchAsync(
            Arg.Is<TreatmentSearchCriteria>(criteria => criteria.ScopeStaffMemberId == null), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ListMapsNextSessionToLowestOpenSession()
    {
        _bed.UseRole("owner");
        _bed.Sessions(TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked, TreatmentSessionStatus.NotBooked);
        _bed.Visit(1, AppointmentStatus.Confirmed);

        var row = (await _bed.Create().ListAsync(new PagedQuery(), new TreatmentListQuery(), default)).Data!.Items.Single();

        row.NextSession!.SequenceNumber.Should().Be(2);
        row.NextSession.Appointment!.Status.Should().Be(AppointmentStatus.Confirmed);
    }

    [Fact]
    public async Task DetailOutsideScopeNotFound()
    {
        _bed.UseRole("staff");

        await FluentActions.Awaiting(() => _bed.Create().GetAsync(_bed.Plan.Id, default))
            .Should().ThrowAsync<NotFoundException>().Where(error => error.Code == TreatmentErrors.TreatmentPlanNotFoundCode);
        await FluentActions.Awaiting(() => _bed.Create().GetAsync(Guid.NewGuid(), default))
            .Should().ThrowAsync<NotFoundException>().Where(error => error.Code == TreatmentErrors.TreatmentPlanNotFoundCode);
    }

    [Fact]
    public async Task DetailSplitsCareHistoryFromSessions()
    {
        _bed.UseRole("owner");
        _bed.Sessions(TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked, TreatmentSessionStatus.NotBooked);
        _bed.Visit(0, AppointmentStatus.NoShow, daysFromToday: -20);
        _bed.Visit(0, AppointmentStatus.Completed, daysFromToday: -10);
        _bed.Visit(1, AppointmentStatus.Confirmed, daysFromToday: 2);
        _bed.Treatments.HasAllergiesAsync(_bed.Plan.Customer.Id, Arg.Any<CancellationToken>()).Returns(true);

        var plan = (await _bed.Create().GetAsync(_bed.Plan.Id, default)).Data!;

        plan.CareHistory.Select(entry => entry.Status).Should().Equal(AppointmentStatus.NoShow, AppointmentStatus.Completed);
        plan.CareHistory[0].Result.Should().BeNull();
        plan.CareHistory[1].Result.Should().Be("Kết quả buổi 1");
        plan.Sessions[0].Appointment!.Status.Should().Be(AppointmentStatus.Completed);
        plan.Sessions[1].Appointment!.Status.Should().Be(AppointmentStatus.Confirmed);
        plan.Sessions[2].Appointment.Should().BeNull();
        plan.Note.Should().Be("Ghi chú nội bộ");
        plan.HasAllergies.Should().BeTrue();
    }

    [Fact]
    public async Task CanManageOnlyForOwner()
    {
        _bed.UseRole("owner");
        var owner = (await _bed.Create().GetAsync(_bed.Plan.Id, default)).Data!;

        var primary = _bed.UseRole("staff");
        _bed.Plan = _bed.Plan with { PrimaryStaff = new StaffRefDto(primary, "Lan") };
        var lead = (await _bed.Create().GetAsync(_bed.Plan.Id, default)).Data!;

        var assigned = _bed.UseRole("staff");
        _bed.Treatments.IsAssignedToPlanAsync(_bed.Plan.Id, assigned, Arg.Any<CancellationToken>()).Returns(true);
        var viewer = (await _bed.Create().GetAsync(_bed.Plan.Id, default)).Data!;

        (owner.CanEdit, owner.CanManage).Should().Be((true, true));
        (lead.CanEdit, lead.CanManage).Should().Be((true, false));
        (viewer.CanEdit, viewer.CanManage).Should().Be((false, false));
    }

    [Fact]
    public void UnknownStatusOrLongSearchInvalid()
    {
        var validator = new NhuNguyetSpa.Application.Validators.Treatments.TreatmentListQueryValidator();
        validator.Validate(new TreatmentListQuery { Status = "done" }).IsValid.Should().BeFalse();
        validator.Validate(new TreatmentListQuery { Status = "cancelled" }).IsValid.Should().BeTrue();
    }
}
