using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Treatments;
using NhuNguyetSpa.Application.Validators;
using NhuNguyetSpa.Application.Validators.Treatments;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NSubstitute;

namespace NhuNguyetSpa.Application.Tests.Treatments;

/// <summary>Substitutes and one plan for <see cref="TreatmentManagementService"/> tests. Clock: 00:30 VN on 27/10/2026.</summary>
internal sealed class TreatmentTestBed
{
    public static readonly DateTime Now = StaffTestDoubles.Now;
    public static readonly DateOnly Today = StaffTestDoubles.VietnamToday;

    public ITreatmentRepository Treatments { get; } = Substitute.For<ITreatmentRepository>();
    public IPurchaseRepository Purchases { get; } = Substitute.For<IPurchaseRepository>();
    public IAppointmentRepository Appointments { get; } = Substitute.For<IAppointmentRepository>();
    public IStaffMemberRepository StaffMembers { get; } = Substitute.For<IStaffMemberRepository>();
    public IUnitOfWork UnitOfWork { get; } = Substitute.For<IUnitOfWork>();

    /// <summary>The tracked rows the commands change (returned by the package lock).</summary>
    public CustomerPackage PackageEntity { get; } = new() { TotalSessions = 3, UsedSessions = 1, Status = CustomerPackageStatus.Active, PackageName = "Gói trị mụn" };
    public TreatmentPlan PlanEntity { get; } = new() { Status = TreatmentPlanStatus.InProgress, StartDate = Today.AddDays(-20) };
    public TreatmentsOptions Options { get; } = new();
    public ICurrentUserService User { get; private set; } = StaffTestDoubles.User("owner");
    public TreatmentPlanRow Plan { get; set; }
    public List<TreatmentSessionRow> SessionRows { get; } = [];
    public List<SessionVisitRow> Visits { get; } = [];

    public TreatmentTestBed()
    {
        Plan = new TreatmentPlanRow(
            Guid.NewGuid(), Guid.NewGuid(), "Gói trị mụn", null, TreatmentPlanStatus.InProgress, null, "Giảm mụn", "Ghi chú nội bộ", Today.AddDays(-20),
            null, null, null, CustomerPackageStatus.Active, Now.AddDays(60), Now.AddDays(-30), 3, 1, 1,
            new TreatmentCustomerDto(Guid.NewGuid(), "Nguyễn Mai", "0900000000"), new PurchaseOrderRefDto(Guid.NewGuid(), "DH1"));
        Treatments.GetPlanAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(call => call.Arg<Guid>() == Plan.Id ? Plan : null);
        Treatments.SearchAsync(Arg.Any<TreatmentSearchCriteria>(), Arg.Any<CancellationToken>())
            .Returns(call => new PagedResult<TreatmentPlanRow>([Plan], call.Arg<TreatmentSearchCriteria>().PageNumber,
                call.Arg<TreatmentSearchCriteria>().PageSize, 1));
        Treatments.GetSessionsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns(_ => SessionRows);
        Treatments.GetVisitsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns(_ => Visits);
        Treatments.GetSkinProfilesAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns([]);
        PlanEntity.Id = Plan.Id;
        PackageEntity.Id = Plan.CustomerPackageId;
        PackageEntity.CustomerId = Plan.Customer.Id;
        Purchases.GetPackageForUpdateAsync(Plan.Id, Arg.Any<CancellationToken>()).Returns(_ => (PackageEntity, PlanEntity));
        UnitOfWork.ExecuteInTransactionAsync(Arg.Any<Func<CancellationToken, Task>>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Func<CancellationToken, Task>>()(CancellationToken.None));
    }

    /// <summary>Makes the signed-in staff member the plan's primary staff (row and tracked entity).</summary>
    public Guid UsePrimaryStaff()
    {
        var staffId = UseRole("staff");
        Plan = Plan with { PrimaryStaff = new StaffRefDto(staffId, "Lan") };
        PlanEntity.PrimaryStaffMemberId = staffId;
        return staffId;
    }

    public void PlanStatus(TreatmentPlanStatus status)
    {
        Plan = Plan with { Status = status };
        PlanEntity.Status = status;
    }

    /// <summary>Signs in a new user with <paramref name="role"/> and returns their id.</summary>
    public Guid UseRole(string role)
    {
        User = StaffTestDoubles.User(role);
        return User.UserId!.Value;
    }

    public void Sessions(params TreatmentSessionStatus[] statuses)
    {
        for (var index = 0; index < statuses.Length; index++)
            SessionRows.Add(new TreatmentSessionRow(Guid.NewGuid(), Plan.Id, Guid.NewGuid(), index + 1, $"Buổi {index + 1}", 60, statuses[index],
                statuses[index] == TreatmentSessionStatus.Completed ? $"Kết quả buổi {index + 1}" : null, null));
    }

    public void Visit(int sessionIndex, AppointmentStatus status, int daysFromToday = 0) =>
        Visits.Add(new SessionVisitRow(Guid.NewGuid(), SessionRows[sessionIndex].Id, Today.AddDays(daysFromToday), new TimeOnly(9, 0),
            new TimeOnly(10, 0), status, new StaffRefDto(Guid.NewGuid(), "Lan"), null));

    public TreatmentManagementService Create() => new(Treatments, Purchases, Appointments, StaffMembers, UnitOfWork, User, StaffTestDoubles.Clock(),
        Microsoft.Extensions.Options.Options.Create(Options), new PagedQueryValidator(), new TreatmentListQueryValidator(),
        new UpdateTreatmentPlanRequestValidator(), new UpdateTreatmentSessionRequestValidator(), new TreatmentReasonRequestValidator());
}
