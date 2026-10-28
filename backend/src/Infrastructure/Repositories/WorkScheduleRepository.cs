using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class WorkScheduleRepository : Repository<WorkSchedule>, IWorkScheduleRepository
{
    public WorkScheduleRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<WorkScheduleDto>> ListAsync(
        DateOnly fromDate, DateOnly toDate, Guid? staffMemberId, WorkScheduleStatus? status, CancellationToken cancellationToken)
    {
        var query = Set.AsNoTracking().Where(shift => shift.Date >= fromDate && shift.Date <= toDate);
        if (staffMemberId is { } staffId)
            query = query.Where(shift => shift.StaffMemberId == staffId);
        if (status is { } wanted)
            query = query.Where(shift => shift.Status == wanted);
        return await query
            .OrderBy(shift => shift.Date)
            .ThenBy(shift => shift.StartTime)
            .ThenBy(shift => shift.StaffMember.User.FullName)
            .ThenBy(shift => shift.Id)
            .Select(ToDto)
            .ToListAsync(cancellationToken);
    }

    public Task<WorkScheduleDto?> GetDtoAsync(Guid id, CancellationToken cancellationToken) =>
        Set.AsNoTracking().Where(shift => shift.Id == id).Select(ToDto).FirstOrDefaultAsync(cancellationToken);

    public Task<bool> HasActiveOverlapAsync(
        Guid staffMemberId, DateOnly date, TimeOnly start, TimeOnly end, Guid? excludeId, CancellationToken cancellationToken) =>
        Set.AnyAsync(shift =>
            shift.StaffMemberId == staffMemberId && shift.Date == date && shift.Status == WorkScheduleStatus.Active &&
            (excludeId == null || shift.Id != excludeId) && shift.StartTime < end && start < shift.EndTime, cancellationToken);

    public async Task<IReadOnlyList<(Guid StaffMemberId, DateOnly Date, TimeOnly Start, TimeOnly End)>> GetActiveRangesAsync(
        IReadOnlyCollection<Guid> staffMemberIds, DateOnly fromDate, DateOnly toDate, CancellationToken cancellationToken)
    {
        var ranges = await Set.AsNoTracking()
            .Where(shift => staffMemberIds.Contains(shift.StaffMemberId) && shift.Status == WorkScheduleStatus.Active &&
                            shift.Date >= fromDate && shift.Date <= toDate)
            .Select(shift => new { shift.StaffMemberId, shift.Date, shift.StartTime, shift.EndTime })
            .ToListAsync(cancellationToken);
        return ranges.Select(range => (range.StaffMemberId, range.Date, range.StartTime, range.EndTime)).ToList();
    }

    private static readonly System.Linq.Expressions.Expression<Func<WorkSchedule, WorkScheduleDto>> ToDto = shift => new WorkScheduleDto(
        shift.Id, shift.StaffMemberId, shift.StaffMember.User.FullName, shift.Date, shift.StartTime, shift.EndTime, shift.Status);
}
