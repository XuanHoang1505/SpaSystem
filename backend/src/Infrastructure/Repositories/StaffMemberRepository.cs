using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

// Name search uses f_unaccent(lower(x)) on both sides like the catalog; "%", "_" and "\" in the search text are literal.
public sealed class StaffMemberRepository : Repository<StaffMember>, IStaffMemberRepository
{
    public StaffMemberRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<PagedResult<StaffListItemDto>> SearchAsync(StaffSearchCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var query = Filter(Set.AsNoTracking(), criteria);
        if (criteria.Search is { } search)
        {
            var pattern = CatalogSearchText.Contains(search);
            query = query.Where(staff =>
                EF.Functions.Like(AppDbContext.Unaccent(staff.User.FullName.ToLower()), AppDbContext.Unaccent(pattern.ToLower()), CatalogSearchText.EscapeCharacter) ||
                EF.Functions.ILike(staff.User.Email, pattern, CatalogSearchText.EscapeCharacter) ||
                EF.Functions.Like(staff.User.PhoneNumber, pattern, CatalogSearchText.EscapeCharacter));
        }
        var today = criteria.Today;
        query = criteria.Resigned switch
        {
            true => query.Where(staff => staff.ResignationDate != null && staff.ResignationDate <= today),
            false => query.Where(staff => staff.ResignationDate == null || staff.ResignationDate > today),
            null => query,
        };

        var total = await query.CountAsync(cancellationToken);
        var items = await Page(query, criteria)
            .Select(staff => new StaffListItemDto(
                staff.Id, staff.User.FullName, staff.User.Email, staff.User.PhoneNumber, staff.User.AvatarUrl, staff.Specialty, staff.HireDate,
                staff.ResignationDate, staff.User.Status,
                staff.Skills.OrderBy(skill => skill.SpaService.Name)
                    .Select(skill => new StaffServiceDto(skill.SpaServiceId, skill.SpaService.Name, skill.SpaService.Status)).ToList()))
            .ToListAsync(cancellationToken);
        return new PagedResult<StaffListItemDto>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public async Task<PagedResult<PublicStaffListItemDto>> SearchPublicAsync(StaffSearchCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var today = criteria.Today;
        var query = Filter(Set.AsNoTracking(), criteria)
            .Where(staff => staff.User.Status == UserStatus.Active && (staff.ResignationDate == null || staff.ResignationDate > today));
        if (criteria.Search is { } search)
        {
            var pattern = CatalogSearchText.Contains(search);
            query = query.Where(staff =>
                EF.Functions.Like(AppDbContext.Unaccent(staff.User.FullName.ToLower()), AppDbContext.Unaccent(pattern.ToLower()), CatalogSearchText.EscapeCharacter));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await Page(query, criteria)
            .Select(staff => new PublicStaffListItemDto(staff.Id, staff.User.FullName, staff.Specialty, staff.User.AvatarUrl))
            .ToListAsync(cancellationToken);
        return new PagedResult<PublicStaffListItemDto>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public Task<StaffDetailDto?> GetDetailAsync(Guid id, CancellationToken cancellationToken) => Set.AsNoTracking()
        .Where(staff => staff.Id == id)
        .Select(staff => new StaffDetailDto(
            staff.Id, staff.User.FullName, staff.User.Email, staff.User.PhoneNumber, staff.User.AvatarUrl, staff.Specialty, staff.HireDate,
            staff.ResignationDate, staff.User.Status,
            staff.Skills.OrderBy(skill => skill.SpaService.Name)
                .Select(skill => new StaffServiceDto(skill.SpaServiceId, skill.SpaService.Name, skill.SpaService.Status)).ToList(),
            staff.User.CreatedAtUtc, staff.User.UpdatedAtUtc))
        .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<StaffMember>> GetWithUsersAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken) =>
        await Set.AsNoTracking().Include(staff => staff.User).Where(staff => ids.Contains(staff.Id)).ToListAsync(cancellationToken);

    public Task<StaffMember?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken) => Set
        .Include(staff => staff.User)
        .Include(staff => staff.Skills)
        .FirstOrDefaultAsync(staff => staff.Id == id, cancellationToken);

    public Task<DateOnly?> GetEarliestActiveShiftDateAsync(Guid id, CancellationToken cancellationToken) => Context.WorkSchedules.AsNoTracking()
        .Where(shift => shift.StaffMemberId == id && shift.Status == WorkScheduleStatus.Active)
        .MinAsync(shift => (DateOnly?)shift.Date, cancellationToken);

    public async Task CancelActiveShiftsFromAsync(Guid id, DateOnly fromDate, CancellationToken cancellationToken)
    {
        var shifts = await Context.WorkSchedules
            .Where(shift => shift.StaffMemberId == id && shift.Status == WorkScheduleStatus.Active && shift.Date >= fromDate)
            .ToListAsync(cancellationToken);
        foreach (var shift in shifts)
            shift.Cancel();
    }

    private static IQueryable<StaffMember> Filter(IQueryable<StaffMember> query, StaffSearchCriteria criteria) =>
        criteria.SpaServiceId is { } serviceId ? query.Where(staff => staff.Skills.Any(skill => skill.SpaServiceId == serviceId)) : query;

    private static IQueryable<StaffMember> Page(IQueryable<StaffMember> query, StaffSearchCriteria criteria) => query
        .OrderBy(staff => staff.User.FullName)
        .ThenBy(staff => staff.Id)
        .Skip((criteria.PageNumber - 1) * criteria.PageSize)
        .Take(criteria.PageSize);
}
