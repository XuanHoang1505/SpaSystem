using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.WorkSchedules;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class AppointmentRepository : Repository<Appointment>, IAppointmentRepository
{
    public AppointmentRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<AppointmentToReassignDto>> GetOccupyingFromAsync(
        Guid staffMemberId, DateOnly fromDate, DateTime nowUtc, CancellationToken cancellationToken) =>
        await Set.AsNoTracking()
            .Where(AppointmentOccupancy.IsOccupying(nowUtc))
            .Where(appointment => appointment.StaffMemberId == staffMemberId && appointment.Date >= fromDate)
            .OrderBy(appointment => appointment.Date)
            .ThenBy(appointment => appointment.StartTime)
            .Select(appointment => new AppointmentToReassignDto(
                appointment.Id, appointment.Date, appointment.StartTime, appointment.EndTime, appointment.Status,
                appointment.CustomerId, appointment.Customer.User.FullName))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<(TimeOnly Start, TimeOnly End)>> GetOccupyingOnAsync(
        Guid staffMemberId, DateOnly date, DateTime nowUtc, CancellationToken cancellationToken)
    {
        var slots = await Set.AsNoTracking()
            .Where(AppointmentOccupancy.IsOccupying(nowUtc))
            .Where(appointment => appointment.StaffMemberId == staffMemberId && appointment.Date == date)
            .Select(appointment => new { appointment.StartTime, appointment.EndTime })
            .ToListAsync(cancellationToken);
        return slots.Select(slot => (slot.StartTime, slot.EndTime)).ToList();
    }
}
