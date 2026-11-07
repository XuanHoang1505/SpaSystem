using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using NhuNguyetSpa.IntegrationTests.Staff;
using Npgsql;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Bookings;

/// <summary>Every appointment carries a source its service is derived from (docs/specs/bookings.md: BR-BKG-13, BKG-T23).</summary>
[Collection(PostgresCollection.Name)]
public sealed class AppointmentSchemaTests : IAsyncLifetime
{
    private static readonly DateOnly Day = new(2026, 11, 2);
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private StaffApi _staff = null!;

    public AppointmentSchemaTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _staff = new StaffApi(_factory, _postgres);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync() => await _factory.DisposeAsync();

    [Fact]
    public async Task AppointmentWithoutSourceIsRejected()
    {
        var staff = await _staff.SeedStaffAsync("Nhân viên nguồn");
        var customer = await _staff.SeedCustomerAsync("Khách không nguồn");
        await using var context = _postgres.CreateContext();
        context.Appointments.Add(new Appointment
        {
            CustomerId = customer.Id,
            StaffMemberId = staff.Id,
            Date = Day,
            StartTime = new TimeOnly(9, 0),
            EndTime = new TimeOnly(10, 0),
            Status = AppointmentStatus.Confirmed,
            CreatedAtUtc = DateTime.UtcNow,
        });

        var exception = await FluentActions.Invoking(() => context.SaveChangesAsync()).Should().ThrowAsync<DbUpdateException>();
        exception.Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.ConstraintName.Should().Be(AppointmentConstraints.SourceRequired);
    }

    [Theory]
    [InlineData(AppointmentSource.Entitlement)]
    [InlineData(AppointmentSource.Session)]
    [InlineData(AppointmentSource.OrderItem)]
    public async Task AppointmentWithAnySingleSourceIsAccepted(AppointmentSource source)
    {
        var staff = await _staff.SeedStaffAsync("Nhân viên " + source);

        var appointment = await _staff.SeedAppointmentAsync(
            staff.Id, Day, new TimeOnly(9, 0), new TimeOnly(10, 0), AppointmentStatus.Confirmed, source: source);

        appointment.Id.Should().NotBeEmpty();
    }
}
