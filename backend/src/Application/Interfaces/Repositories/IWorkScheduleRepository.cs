using NhuNguyetSpa.Application.DTOs.WorkSchedules;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface IWorkScheduleRepository : IRepository<WorkSchedule>
{
    /// <summary>Shifts dated in [<paramref name="fromDate"/>, <paramref name="toDate"/>], ordered by date, start time, staff name.</summary>
    Task<IReadOnlyList<WorkScheduleDto>> ListAsync(DateOnly fromDate, DateOnly toDate, Guid? staffMemberId, WorkScheduleStatus? status, CancellationToken cancellationToken);

    Task<WorkScheduleDto?> GetDtoAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>True when another active shift of the staff member on that date overlaps [start, end) (touching is fine).</summary>
    Task<bool> HasActiveOverlapAsync(Guid staffMemberId, DateOnly date, TimeOnly start, TimeOnly end, Guid? excludeId, CancellationToken cancellationToken);

    /// <summary>Active shifts of the given staff members dated in [<paramref name="fromDate"/>, <paramref name="toDate"/>].</summary>
    Task<IReadOnlyList<(Guid StaffMemberId, DateOnly Date, TimeOnly Start, TimeOnly End)>> GetActiveRangesAsync(
        IReadOnlyCollection<Guid> staffMemberIds, DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken);
}
