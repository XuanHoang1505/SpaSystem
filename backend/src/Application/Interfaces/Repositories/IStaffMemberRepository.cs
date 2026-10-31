using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;
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

    /// <summary>
    /// Step A3: staff with the service skill, an active account, hired on or before <paramref name="date"/> and still working
    /// that day; only <paramref name="staffMemberId"/> when given. Ordered by name.
    /// </summary>
    Task<IReadOnlyList<AvailabilityCandidate>> GetAvailabilityCandidatesAsync(
        Guid spaServiceId, DateOnly date, Guid? staffMemberId, CancellationToken cancellationToken);

    Task<bool> HasSkillAsync(Guid staffMemberId, Guid spaServiceId, CancellationToken cancellationToken);

    /// <summary>
    /// Locks the staff member row (<c>FOR NO KEY UPDATE</c>; call inside a transaction) so writes into one staff member's
    /// timetable run one after another: two concurrent EXCLUDE checks on appointments can otherwise deadlock.
    /// </summary>
    Task LockForBookingAsync(Guid staffMemberId, CancellationToken cancellationToken);

    /// <summary>
    /// Locks several staff rows in ascending id order in one statement (<c>FOR NO KEY UPDATE</c>, inside a transaction), so two
    /// "any staff" bookings over the same candidates wait for each other instead of deadlocking (BR-BKG-14).
    /// </summary>
    Task LockManyForBookingAsync(IReadOnlyCollection<Guid> staffMemberIds, CancellationToken cancellationToken);
}
