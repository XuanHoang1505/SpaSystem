using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>Appointment reads used by staff and shift management; "occupying" follows <c>AppointmentOccupancy</c> (BR-STF-07).</summary>
public interface IAppointmentRepository : IRepository<Appointment>
{
    /// <summary>Occupying appointments of the staff member dated on or after <paramref name="fromDate"/>, by date then start time.</summary>
    Task<IReadOnlyList<AppointmentToReassignDto>> GetOccupyingFromAsync(Guid staffMemberId, DateOnly fromDate, DateTime nowUtc, CancellationToken cancellationToken);

    /// <summary>Time ranges of the staff member's occupying appointments on <paramref name="date"/>.</summary>
    Task<IReadOnlyList<(TimeOnly Start, TimeOnly End)>> GetOccupyingOnAsync(Guid staffMemberId, DateOnly date, DateTime nowUtc, CancellationToken cancellationToken);
}
