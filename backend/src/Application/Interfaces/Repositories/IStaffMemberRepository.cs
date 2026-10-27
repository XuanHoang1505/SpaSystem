using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface IStaffMemberRepository : IRepository<StaffMember>
{
    /// <summary>Owner list: every staff member, filtered by <see cref="StaffSearchCriteria"/>, ordered by name then id.</summary>
    Task<PagedResult<StaffListItemDto>> SearchAsync(StaffSearchCriteria criteria, CancellationToken cancellationToken);

    /// <summary>Public list: only staff working on <c>Today</c> with an active account; <c>Resigned</c> is ignored.</summary>
    Task<PagedResult<PublicStaffListItemDto>> SearchPublicAsync(StaffSearchCriteria criteria, CancellationToken cancellationToken);

    Task<StaffDetailDto?> GetDetailAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Untracked, with <c>User</c>; ids that do not exist are simply missing from the result.</summary>
    Task<IReadOnlyList<StaffMember>> GetWithUsersAsync(IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken);

    /// <summary>Tracked, with <c>User</c> and <c>Skills</c>.</summary>
    Task<StaffMember?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Date of the staff member's earliest active shift, or null.</summary>
    Task<DateOnly?> GetEarliestActiveShiftDateAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Cancels (tracked) every active shift dated on or after <paramref name="fromDate"/>; saved with the unit of work.</summary>
    Task CancelActiveShiftsFromAsync(Guid id, DateOnly fromDate, CancellationToken cancellationToken);
}
