using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Care;
using NhuNguyetSpa.Application.Validators.Care;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Care;

/// <summary>
/// UC-SPA-28 (docs/specs/care.md BR-CARE-03, BR-TRT-02, BR-TRT-03). The clock is 03:00 UTC on 31/10/2026 = 10:00 in Vietnam;
/// the appointment is 31/10 09:00–10:00, so it has started.
/// </summary>
public sealed class AppointmentCompletionServiceTests
{
    private static readonly DateTime Now = new(2026, 10, 31, 3, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly Day = new(2026, 10, 31);
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IPurchaseRepository _purchases = Substitute.For<IPurchaseRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly Guid _staffId = Guid.NewGuid();
    private readonly Appointment _appointment;
    private readonly CareOptions _options = new();

    public AppointmentCompletionServiceTests()
    {
        _appointment = new Appointment
        {
            CustomerId = Guid.NewGuid(),
            StaffMemberId = _staffId,
            Date = Day,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(10, 0),
            Status = AppointmentStatus.Confirmed,
        };
        _appointments.GetForUpdateAsync(_appointment.Id, Arg.Any<CancellationToken>()).Returns((_appointment, Guid.NewGuid()));
        _appointments.GetDetailAsync(_appointment.Id, Arg.Any<CancellationToken>()).Returns(new AppointmentDetailDto(
            _appointment.Id, Day, new TimeOnly(9, 0), new TimeOnly(10, 0), AppointmentStatus.Completed,
            new AppointmentCustomerDto(_appointment.CustomerId, "Khách", "0900000000"), new AppointmentStaffDto(_staffId, "An"),
            new AppointmentServiceDto(Guid.NewGuid(), "Chăm sóc da"), null, null, null, null, Now, [], null, false, null));
        _unitOfWork.ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<CancellationToken, Task>>()(CancellationToken.None));
    }

    private ICurrentUserService Staff(Guid id)
    {
        var user = Substitute.For<ICurrentUserService>();
        user.IsAuthenticated.Returns(true);
        user.Roles.Returns([Roles.Staff]);
        user.UserId.Returns(id);
        return user;
    }

    private AppointmentCompletionService Create(DateTime? now = null, Guid? userId = null)
    {
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(now ?? Now);
        return new AppointmentCompletionService(
            _appointments, _purchases, _unitOfWork, Staff(userId ?? _staffId), clock, Options.Create(_options),
            new CompleteAppointmentRequestValidator());
    }

    private Task<NhuNguyetSpa.Application.Common.Models.OperationResult<CompleteAppointmentResult>> Complete(
        string? result = null, DateTime? now = null, Guid? userId = null) =>
        Create(now, userId).CompleteAsync(_appointment.Id, new CompleteAppointmentRequest(result), CancellationToken.None);

    private async Task<string?> CompleteFails(string? result = null, DateTime? now = null, Guid? userId = null) =>
        (await FluentActions.Invoking(() => Complete(result, now, userId)).Should().ThrowAsync<DomainException>()).Which.Code;

    private ServiceEntitlement WithEntitlement(EntitlementStatus status = EntitlementStatus.Booked)
    {
        var entitlement = new ServiceEntitlement { Status = status };
        _appointment.ServiceEntitlementId = entitlement.Id;
        _appointment.ServiceEntitlement = entitlement;
        return entitlement;
    }

    private (TreatmentSession Session, CustomerPackage Package, TreatmentPlan Plan) WithSession(
        int used, int total, TreatmentSessionStatus sessionStatus = TreatmentSessionStatus.Booked,
        CustomerPackageStatus packageStatus = CustomerPackageStatus.Active, TreatmentPlanStatus planStatus = TreatmentPlanStatus.NotStarted)
    {
        var package = new CustomerPackage { PackageName = "Gói trị mụn", UsedSessions = used, TotalSessions = total, Status = packageStatus };
        var plan = new TreatmentPlan { CustomerPackageId = package.Id, Status = planStatus };
        var session = new TreatmentSession { TreatmentPlanId = plan.Id, SequenceNumber = used + 1, Status = sessionStatus };
        _appointment.TreatmentSessionId = session.Id;
        _appointment.TreatmentSession = session;
        _purchases.GetPackageForUpdateAsync(plan.Id, Arg.Any<CancellationToken>()).Returns((package, plan));
        return (session, package, plan);
    }

    [Fact]
    public async Task NotAssignedStaffIsForbidden()
    {
        WithEntitlement();

        (await CompleteFails(userId: Guid.NewGuid())).Should().Be("appointment_not_assigned");
        _appointment.Status.Should().Be(AppointmentStatus.Confirmed);
    }

    [Fact]
    public async Task EntitlementPathMarksUsedAndAppendsResult()
    {
        var entitlement = WithEntitlement();
        _appointment.Note = "Khách đến sớm";

        var result = await Complete("  Da sáng hơn  ");

        _appointment.Status.Should().Be(AppointmentStatus.Completed);
        _appointment.Note.Should().Be("Khách đến sớm\nDa sáng hơn");
        entitlement.Status.Should().Be(EntitlementStatus.Used);
        result.Data!.PackageProgress.Should().BeNull();
        result.Data.Appointment.Id.Should().Be(_appointment.Id);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task BlankResultIsNotWritten()
    {
        WithEntitlement();
        await Complete("   ");
        _appointment.Note.Should().BeNull();
    }

    [Fact]
    public async Task SessionPathCompletesSessionAndAdvancesPackage()
    {
        var (session, package, plan) = WithSession(used: 0, total: 3);

        var result = await Complete("Giảm mụn");

        session.Status.Should().Be(TreatmentSessionStatus.Completed);
        session.Note.Should().Be("Giảm mụn");
        session.CompletedAtUtc.Should().Be(Now);
        _appointment.Note.Should().BeNull();
        _appointment.Status.Should().Be(AppointmentStatus.Completed);
        package.UsedSessions.Should().Be(1);
        package.Status.Should().Be(CustomerPackageStatus.Active);
        plan.Status.Should().Be(TreatmentPlanStatus.InProgress);
        plan.StartDate.Should().Be(Day);
        result.Data!.PackageProgress.Should().Be(new PackageProgressDto(package.Id, "Gói trị mụn", 1, 3, CustomerPackageStatus.Active));
    }

    [Fact]
    public async Task LastSessionCompletesPackageAndPlan()
    {
        var (_, package, plan) = WithSession(used: 2, total: 3, planStatus: TreatmentPlanStatus.InProgress);

        var result = await Complete();

        package.Status.Should().Be(CustomerPackageStatus.Completed);
        plan.Status.Should().Be(TreatmentPlanStatus.Completed);
        plan.ActualEndDate.Should().Be(Day);
        result.Data!.PackageProgress!.Status.Should().Be(CustomerPackageStatus.Completed);
    }

    [Fact]
    public async Task ExpiredPackageAndPausedPlanStillComplete()
    {
        var (session, package, plan) = WithSession(used: 0, total: 3, packageStatus: CustomerPackageStatus.Expired,
            planStatus: TreatmentPlanStatus.Paused);

        await Complete();

        session.Status.Should().Be(TreatmentSessionStatus.Completed);
        package.UsedSessions.Should().Be(1);
        plan.Status.Should().Be(TreatmentPlanStatus.Paused);
    }

    [Fact]
    public async Task EntitlementNotBookedIsStateInvalid()
    {
        WithEntitlement(EntitlementStatus.Used);
        (await CompleteFails()).Should().Be(CareErrors.EntitlementStateInvalidCode);
        _appointment.Status.Should().Be(AppointmentStatus.Confirmed);
    }

    [Fact]
    public async Task SessionNotBookedIsStateInvalid()
    {
        WithSession(used: 0, total: 3, sessionStatus: TreatmentSessionStatus.NotBooked);
        (await CompleteFails()).Should().Be(CareErrors.EntitlementStateInvalidCode);
    }

    [Theory]
    [InlineData(CustomerPackageStatus.Cancelled, TreatmentPlanStatus.InProgress)]
    [InlineData(CustomerPackageStatus.Active, TreatmentPlanStatus.Cancelled)]
    public async Task CancelledPackageOrPlanIsStateInvalid(CustomerPackageStatus packageStatus, TreatmentPlanStatus planStatus)
    {
        var (session, _, _) = WithSession(used: 0, total: 3, packageStatus: packageStatus, planStatus: planStatus);

        var exception = (await FluentActions.Invoking(() => Complete()).Should().ThrowAsync<ConflictException>()).Which;

        exception.Code.Should().Be(CareErrors.EntitlementStateInvalidCode);
        exception.Message.Should().Be("Gói hoặc liệu trình đã bị hủy.");
        session.Status.Should().Be(TreatmentSessionStatus.Booked);
    }

    [Fact]
    public async Task StatusAndTimeAreChecked()
    {
        WithEntitlement();
        (await CompleteFails(now: Now.AddHours(-1).AddMinutes(-1))).Should().Be(CareErrors.CompleteTooEarlyCode);

        _appointment.Status = AppointmentStatus.Cancelled;
        (await CompleteFails()).Should().Be("appointment_status_invalid");
    }

    [Fact]
    public async Task RequireSkinProfileOnAndMissingIsRequired()
    {
        WithEntitlement();
        _options.RequireSkinProfileToComplete = true;

        (await CompleteFails()).Should().Be(CareErrors.SkinProfileRequiredCode);

        _appointments.HasSkinProfileAsync(_appointment.Id, Arg.Any<CancellationToken>()).Returns(true);
        await Complete();
        _appointment.Status.Should().Be(AppointmentStatus.Completed);
    }

    [Fact]
    public async Task CompleteAcrossMidnightUsesAppointmentDate()
    {
        _appointment.StartTime = new TimeOnly(23, 0);
        _appointment.EndTime = new TimeOnly(23, 59);
        var (_, _, plan) = WithSession(used: 0, total: 2);

        // 17:10Z on 31/10 = 00:10 on 01/11 in Vietnam.
        await Complete(now: new DateTime(2026, 10, 31, 17, 10, 0, DateTimeKind.Utc));

        plan.StartDate.Should().Be(Day);
    }

    [Fact]
    public async Task UnknownAppointmentIsNotFound()
    {
        (await FluentActions.Invoking(() => Create().CompleteAsync(Guid.NewGuid(), new CompleteAppointmentRequest(null), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("appointment_not_found");
    }

    [Fact]
    public async Task ResultOver2000IsInvalid()
    {
        WithEntitlement();
        await FluentActions.Invoking(() => Complete(new string('a', 2001))).Should().ThrowAsync<FluentValidation.ValidationException>();
        _appointment.Status.Should().Be(AppointmentStatus.Confirmed);
    }
}
