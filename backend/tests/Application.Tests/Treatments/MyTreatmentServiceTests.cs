using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Application.UseCases.Treatments;
using NhuNguyetSpa.Application.Validators.Treatments;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Treatments;

/// <summary>UC-SPA-19 (docs/specs/purchases-treatments.md BR-TRT-10; TRT-T12, T14, T15, T17). Clock: 00:30 VN on 27/10/2026.</summary>
public sealed class MyTreatmentServiceTests
{
    private static readonly DateTime Now = StaffTestDoubles.Now;
    private static readonly DateOnly Today = StaffTestDoubles.VietnamToday;
    private readonly ITreatmentRepository _treatments = Substitute.For<ITreatmentRepository>();
    private readonly IPurchaseRepository _purchases = Substitute.For<IPurchaseRepository>();
    private readonly NhuNguyetSpa.Application.Common.Interfaces.ICurrentUserService _user = StaffTestDoubles.User("customer");
    private readonly TreatmentsOptions _options = new();
    private readonly List<TreatmentSessionRow> _sessions = [];
    private readonly List<SessionVisitRow> _visits = [];
    private readonly Dictionary<Guid, SessionBookingFacts> _facts = [];
    private readonly StaffRefDto _staff = new(Guid.NewGuid(), "Lan");
    private TreatmentPlanRow _plan;

    public MyTreatmentServiceTests()
    {
        _plan = Plan();
        _treatments.GetPlanAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(call => call.Arg<Guid>() == _plan.Id ? _plan : null);
        _treatments.ListForCustomerAsync(_user.UserId!.Value, Arg.Any<TreatmentPlanStatus?>(), 200, Arg.Any<CancellationToken>()).Returns(_ => [_plan]);
        _treatments.GetSessionsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns(_ => _sessions);
        _treatments.GetVisitsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns(_ => _visits);
        _purchases.GetSessionFactsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), _user.UserId!.Value, Arg.Any<CancellationToken>())
            .Returns(_ => _facts);
    }

    private MyTreatmentService Create() => new(_treatments, _purchases, _user, StaffTestDoubles.Clock(),
        Options.Create(new PurchasesOptions()), Options.Create(_options), new MyTreatmentListQueryValidator());

    private TreatmentPlanRow Plan(Guid? customerId = null, TreatmentPlanStatus status = TreatmentPlanStatus.InProgress, string? reason = null,
        CustomerPackageStatus packageStatus = CustomerPackageStatus.Active, DateTime? expiresAtUtc = null) => new(
        Guid.NewGuid(), Guid.NewGuid(), "Gói trị mụn", null, status, reason, "Giảm mụn", "Ghi chú nội bộ", Today.AddDays(-14), null, null, _staff,
        packageStatus, expiresAtUtc ?? Now.AddDays(80), Now.AddDays(-20), 4, 1, 1,
        new TreatmentCustomerDto(customerId ?? _user.UserId!.Value, "Mai", "0900000000"), new PurchaseOrderRefDto(Guid.NewGuid(), "DH1"));

    /// <summary>TRT-T12 data: 4 sessions (1 completed, 1 booked with a confirmed visit, 2 not booked), gap 7 days.</summary>
    private void FourSessions()
    {
        var statuses = new[]
        {
            TreatmentSessionStatus.Completed, TreatmentSessionStatus.Booked, TreatmentSessionStatus.NotBooked, TreatmentSessionStatus.NotBooked,
        };
        for (var index = 0; index < statuses.Length; index++)
        {
            var session = new TreatmentSessionRow(Guid.NewGuid(), _plan.Id, Guid.NewGuid(), index + 1, $"Buổi {index + 1}", 60, statuses[index],
                index == 0 ? "Da giảm mụn" : null, index == 0 ? Now.AddDays(-14) : null);
            _sessions.Add(session);
            PreviousVisit? previous = index == 2 ? new PreviousVisit(Today.AddDays(3), new TimeOnly(10, 0)) : null;
            _facts[session.Id] = new SessionBookingFacts(session.Id, session.SpaServiceId, 60, index + 1, statuses[index], _plan.PackageStatus,
                _plan.ExpiresAtUtc, _plan.Status, index <= 2, previous, 7);
        }

        _visits.Add(new SessionVisitRow(Guid.NewGuid(), _sessions[0].Id, Today.AddDays(-14), new TimeOnly(9, 0), new TimeOnly(10, 0),
            AppointmentStatus.Completed, _staff, Guid.NewGuid()));
        _visits.Add(new SessionVisitRow(Guid.NewGuid(), _sessions[1].Id, Today.AddDays(3), new TimeOnly(9, 0), new TimeOnly(10, 0),
            AppointmentStatus.Confirmed, _staff, null));
    }

    [Fact]
    public async Task ListMapsProgressAndNextSession()
    {
        FourSessions();

        var row = (await Create().ListAsync(new MyTreatmentListQuery(null), default)).Data!.Single();

        row.Should().Match<MyTreatmentListItemDto>(dto => dto.UsedSessions == 1 && dto.BookedSessions == 1 && dto.TotalSessions == 4);
        row.NextSession!.SequenceNumber.Should().Be(3);
        row.NextSession.CanBook.Should().BeTrue();
    }

    [Fact]
    public async Task ThirdSessionBookableFourthNeedsOrder()
    {
        FourSessions();

        var sessions = (await Create().GetAsync(_plan.Id, default)).Data!.Sessions;

        sessions.Select(session => session.SequenceNumber).Should().Equal(1, 2, 3, 4);
        sessions[1].Appointment!.Status.Should().Be(AppointmentStatus.Confirmed);
        sessions[1].Appointment!.Staff.FullName.Should().Be("Lan");
        sessions[2].CanBook.Should().BeTrue();
        sessions[3].CanBook.Should().BeFalse();
        sessions[3].Reason.Should().Be("Cần đặt lịch các buổi trước theo thứ tự.");
        sessions[0].CanBook.Should().BeFalse();
        sessions[0].EarliestDate.Should().BeNull();
    }

    [Fact]
    public async Task EarliestDateIsPreviousVisitPlusGap()
    {
        FourSessions();

        var sessions = (await Create().GetAsync(_plan.Id, default)).Data!.Sessions;

        sessions[2].EarliestDate.Should().Be(Today.AddDays(3 + 7));
    }

    [Fact]
    public async Task PausedPlanReasonAndStatusReason()
    {
        _plan = Plan(status: TreatmentPlanStatus.Paused, reason: "Khách đang điều trị da liễu");
        FourSessions();

        var plan = (await Create().GetAsync(_plan.Id, default)).Data!;

        plan.StatusReason.Should().Be("Khách đang điều trị da liễu");
        plan.Sessions[2].CanBook.Should().BeFalse();
        plan.Sessions[2].Reason.Should().Be("Liệu trình đang tạm dừng hoặc đã hủy.");
    }

    [Fact]
    public async Task ExpiredPackageReadsExpired()
    {
        _plan = Plan(expiresAtUtc: Now.AddMinutes(-1));

        var plan = (await Create().GetAsync(_plan.Id, default)).Data!;

        plan.PackageStatus.Should().Be(CustomerPackageStatus.Expired);
    }

    [Fact]
    public async Task CancelledPackageStaysCancelledWhenExpired()
    {
        _plan = Plan(status: TreatmentPlanStatus.Cancelled, packageStatus: CustomerPackageStatus.Cancelled, expiresAtUtc: Now.AddDays(-1));

        var plan = (await Create().GetAsync(_plan.Id, default)).Data!;

        plan.PackageStatus.Should().Be(CustomerPackageStatus.Cancelled);
    }

    [Fact]
    public async Task SessionDetailHasResultOnlyWhenCompleted()
    {
        FourSessions();
        var service = Create();

        var completed = (await service.GetSessionAsync(_plan.Id, _sessions[0].Id, default)).Data!;
        var booked = (await service.GetSessionAsync(_plan.Id, _sessions[1].Id, default)).Data!;
        var inList = (await service.GetAsync(_plan.Id, default)).Data!.Sessions[0];

        completed.Result.Should().Be("Da giảm mụn");
        booked.Result.Should().BeNull();
        inList.Result.Should().BeNull();
    }

    [Fact]
    public void PlanNoteNeverReturned()
    {
        typeof(MyTreatmentPlanDto).GetProperty("Note").Should().BeNull();
        typeof(MyTreatmentListItemDto).GetProperty("Note").Should().BeNull();
    }

    [Fact]
    public async Task SkinProfileOnlyWhenOptionOn()
    {
        FourSessions();
        _treatments.GetSkinProfileSummaryAsync(_visits[0].AppointmentId, Arg.Any<CancellationToken>())
            .Returns(new SkinProfileSummaryDto(SkinType.Oily, "Giảm mụn", "Làm sạch sâu"));

        var hidden = (await Create().GetSessionAsync(_plan.Id, _sessions[0].Id, default)).Data!;
        _options.ShowSkinProfilesToCustomer = true;
        var shown = (await Create().GetSessionAsync(_plan.Id, _sessions[0].Id, default)).Data!;

        hidden.SkinProfile.Should().BeNull();
        shown.SkinProfile!.SkinType.Should().Be(SkinType.Oily);
    }

    [Fact]
    public async Task OtherCustomersPlanNotFound()
    {
        _plan = Plan(customerId: Guid.NewGuid());
        var service = Create();

        await FluentActions.Awaiting(() => service.GetAsync(_plan.Id, default))
            .Should().ThrowAsync<NotFoundException>().Where(error => error.Code == TreatmentErrors.TreatmentPlanNotFoundCode);
        await FluentActions.Awaiting(() => service.GetAsync(Guid.NewGuid(), default))
            .Should().ThrowAsync<NotFoundException>().Where(error => error.Code == TreatmentErrors.TreatmentPlanNotFoundCode);
    }

    [Fact]
    public async Task SessionOfOtherPlanNotFound()
    {
        FourSessions();

        await FluentActions.Awaiting(() => Create().GetSessionAsync(_plan.Id, Guid.NewGuid(), default))
            .Should().ThrowAsync<NotFoundException>().Where(error => error.Code == BookingErrors.TreatmentSessionNotFoundCode);
    }

    [Fact]
    public async Task StatusFilterIsParsed()
    {
        await Create().ListAsync(new MyTreatmentListQuery("in_progress"), default);

        await _treatments.Received(1).ListForCustomerAsync(_user.UserId!.Value, TreatmentPlanStatus.InProgress, 200, Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("InProgress")]
    public void UnknownStatusInvalid(string status) =>
        new MyTreatmentListQueryValidator().Validate(new MyTreatmentListQuery(status)).IsValid.Should().BeFalse();
}
