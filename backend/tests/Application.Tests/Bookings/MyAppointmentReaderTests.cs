using FluentAssertions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>The customer's appointment with its <c>canReschedule</c>/<c>canCancel</c> flags (UC-SPA-16, BR-BKG-07). Clock: 09:00 VN on 04/11/2026.</summary>
public sealed class MyAppointmentReaderTests
{
    private static readonly DateTime Now = new(2026, 11, 4, 2, 0, 0, DateTimeKind.Utc);
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly Guid _customerId = Guid.NewGuid();
    private readonly MyAppointmentReader _reader;

    public MyAppointmentReaderTests()
    {
        var clock = Substitute.For<IDateTimeProvider>();
        clock.UtcNow.Returns(Now);
        _reader = new MyAppointmentReader(_appointments, clock, Options.Create(new BookingOptions()));
    }

    private Guid Seed(AppointmentStatus status, DateOnly date, TimeOnly start, TreatmentPlanStatus? plan = null)
    {
        var id = Guid.NewGuid();
        var dto = new MyAppointmentDto(id, date, start, start.AddHours(1), status, null, null, null, Now.AddDays(-3),
            new AppointmentServiceDto(Guid.NewGuid(), "Chăm sóc da"), new AppointmentStaffDto(Guid.NewGuid(), "An"),
            plan is null ? AppointmentBookingSource.Entitlement : AppointmentBookingSource.Session, null, null, null);
        var facts = new AppointmentChangeFacts(status, date, start, plan, plan is null ? null : CustomerPackageStatus.Active,
            plan is null ? null : Now.AddDays(60), null);
        _appointments.GetMineAsync(id, _customerId, Arg.Any<CancellationToken>()).Returns(new MyAppointmentRow(dto, facts));
        return id;
    }

    [Fact]
    public async Task ConfirmedBeforeCutoffHasBothFlagsAndDeadline()
    {
        var id = Seed(AppointmentStatus.Confirmed, new DateOnly(2026, 11, 5), new TimeOnly(10, 0));

        var mine = await _reader.GetAsync(id, _customerId, default);

        (mine.CanReschedule, mine.CanCancel).Should().Be((true, true));
        mine.ChangeDeadlineAtUtc.Should().Be(new DateTime(2026, 11, 4, 3, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task InsideCutoffHasNoFlags()
    {
        var mine = await _reader.GetAsync(Seed(AppointmentStatus.Confirmed, new DateOnly(2026, 11, 4), new TimeOnly(20, 0)), _customerId, default);

        (mine.CanReschedule, mine.CanCancel).Should().Be((false, false));
        mine.ChangeDeadlineAtUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task HeldHasNoFlagsAndNoDeadline()
    {
        var mine = await _reader.GetAsync(Seed(AppointmentStatus.Held, new DateOnly(2026, 11, 6), new TimeOnly(10, 0)), _customerId, default);

        (mine.CanReschedule, mine.CanCancel, mine.ChangeDeadlineAtUtc).Should().Be((false, false, (DateTime?)null));
    }

    [Fact]
    public async Task PausedPlanCanCancelButNotReschedule()
    {
        var id = Seed(AppointmentStatus.Confirmed, new DateOnly(2026, 11, 6), new TimeOnly(10, 0), TreatmentPlanStatus.Paused);

        var mine = await _reader.GetAsync(id, _customerId, default);

        (mine.CanReschedule, mine.CanCancel).Should().Be((false, true));
    }

    [Fact]
    public async Task MissingAppointmentIsNotFound()
    {
        var act = () => _reader.GetAsync(Guid.NewGuid(), _customerId, default);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("appointment_not_found");
    }
}
