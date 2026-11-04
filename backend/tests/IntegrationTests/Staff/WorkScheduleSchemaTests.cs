using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NhuNguyetSpa.Infrastructure.Persistence;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Npgsql;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Staff;

/// <summary>The work_schedules overlap constraint (docs/specs/staff.md: BR-STF-03, STF-T17).</summary>
[Collection(PostgresCollection.Name)]
public sealed class WorkScheduleSchemaTests
{
    private static readonly DateOnly Day = new(2026, 11, 2);
    private readonly PostgresFixture _postgres;

    public WorkScheduleSchemaTests(PostgresFixture postgres) => _postgres = postgres;

    [Fact]
    public async Task OverlappingActiveShiftsAreRejected()
    {
        var staffId = await SeedStaffAsync();
        await using var context = _postgres.CreateContext();
        context.WorkSchedules.AddRange(Shift(staffId, 8, 12), Shift(staffId, 11, 13));

        var exception = await FluentActions.Invoking(() => context.SaveChangesAsync()).Should().ThrowAsync<DbUpdateException>();
        exception.Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.ConstraintName.Should().Be(WorkScheduleConstraints.NoOverlap);
    }

    [Fact]
    public async Task TouchingShiftsAreAllowed()
    {
        var staffId = await SeedStaffAsync();
        await using var context = _postgres.CreateContext();
        context.WorkSchedules.AddRange(Shift(staffId, 8, 12), Shift(staffId, 12, 17));

        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task CancelledShiftDoesNotBlock()
    {
        var staffId = await SeedStaffAsync();
        await using var context = _postgres.CreateContext();
        var cancelled = Shift(staffId, 8, 12);
        cancelled.Cancel();
        context.WorkSchedules.AddRange(cancelled, Shift(staffId, 9, 11));

        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task UnitOfWorkTranslatesOverlapToShiftConflict()
    {
        var staffId = await SeedStaffAsync();
        await using var context = _postgres.CreateContext();
        context.WorkSchedules.AddRange(Shift(staffId, 8, 12), Shift(staffId, 10, 14));

        var exception = await FluentActions.Invoking(() => new UnitOfWork(context).SaveChangesAsync()).Should().ThrowAsync<ConflictException>();
        exception.Which.Code.Should().Be("shift_conflict");
    }

    private async Task<Guid> SeedStaffAsync()
    {
        await using var context = _postgres.CreateContext();
        var unique = Guid.NewGuid().ToString("N");
        var user = new User
        {
            FullName = "Nhân viên " + unique[..6],
            Email = $"staff-{unique}@spa.test",
            PhoneNumber = "09" + Random.Shared.NextInt64(10_000_000, 99_999_999),
            PasswordHash = "x",
            Role = UserRole.Staff,
            Status = UserStatus.Active,
        };
        context.Users.Add(user);
        context.StaffMembers.Add(new StaffMember { Id = user.Id, HireDate = new DateOnly(2026, 1, 1) });
        await context.SaveChangesAsync();
        return user.Id;
    }

    private static WorkSchedule Shift(Guid staffId, int startHour, int endHour) =>
        WorkSchedule.Create(staffId, Day, new TimeOnly(startHour, 0), new TimeOnly(endHour, 0));
}
