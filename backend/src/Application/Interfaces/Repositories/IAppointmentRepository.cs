using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>
/// Appointment persistence for staff, shift and booking management; "occupying" follows <c>AppointmentOccupancy</c> (BR-STF-07)
/// and the service of an appointment is derived from its source (BR-BKG-13).
/// </summary>
public interface IAppointmentRepository : IRepository<Appointment>
{
    /// <summary>Occupying appointments of the staff member dated on or after <paramref name="fromDate"/>, by date then start time.</summary>
    Task<IReadOnlyList<AppointmentToReassignDto>> GetOccupyingFromAsync(Guid staffMemberId, DateOnly fromDate, DateTime nowUtc, CancellationToken cancellationToken);

    /// <summary>Time ranges of the staff member's occupying appointments on <paramref name="date"/>.</summary>
    Task<IReadOnlyList<(TimeOnly Start, TimeOnly End)>> GetOccupyingOnAsync(Guid staffMemberId, DateOnly date, DateTime nowUtc, CancellationToken cancellationToken);

    /// <summary>Owner list ordered by date, start time, id.</summary>
    Task<PagedResult<AppointmentListItemDto>> SearchAsync(AppointmentSearchCriteria criteria, CancellationToken cancellationToken);

    Task<AppointmentDetailDto?> GetDetailAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// Locks the appointment row (<c>FOR UPDATE</c>, so call inside a transaction) and returns it tracked with its entitlement
    /// and treatment session, plus its derived service id; null when it does not exist.
    /// </summary>
    Task<(Appointment Appointment, Guid SpaServiceId)?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken);

    Task<Guid?> GetSpaServiceIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Time ranges of the customer's occupying appointments on <paramref name="date"/>, except <paramref name="excludeId"/> (BR-BKG-04).</summary>
    Task<IReadOnlyList<(TimeOnly Start, TimeOnly End)>> GetCustomerOccupyingOnAsync(
        Guid customerId, DateOnly date, DateTime nowUtc, Guid? excludeId, CancellationToken cancellationToken);

    /// <summary>Occupying appointments of the given staff members on <paramref name="date"/>, except <paramref name="excludeId"/>.</summary>
    Task<IReadOnlyList<(Guid StaffMemberId, TimeOnly Start, TimeOnly End)>> GetOccupyingForStaffOnAsync(
        IReadOnlyCollection<Guid> staffMemberIds, DateOnly date, DateTime nowUtc, Guid? excludeId, CancellationToken cancellationToken);

    /// <summary>
    /// BR-BKG-11: turns the staff member's held appointments on <paramref name="date"/> whose hold has run out into
    /// <c>hold_expired</c>, immediately (not through the change tracker), so the EXCLUDE constraint stops counting them
    /// before a slot is written. Returns how many changed.
    /// </summary>
    Task<int> ExpireHeldAsync(Guid staffMemberId, DateOnly date, DateTime nowUtc, CancellationToken cancellationToken);

    /// <summary>
    /// Locks the customer row (<c>FOR NO KEY UPDATE</c>; inside a transaction, after the staff lock) so two writes into one
    /// customer's timetable run one after another: BR-BKG-04 has no database constraint to catch the race.
    /// </summary>
    Task LockCustomerForBookingAsync(Guid customerId, CancellationToken cancellationToken);

    /// <summary>The customer's own appointment (UC-SPA-15/16); null when missing or someone else's.</summary>
    Task<MyAppointmentDto?> GetMineAsync(Guid id, Guid customerId, CancellationToken cancellationToken);

    /// <summary>
    /// Book-now appointments (tracked) whose order line belongs to one of <paramref name="orderIds"/>, held or hold-expired;
    /// used when the order is paid, fails or expires (BR-BKG-06).
    /// </summary>
    Task<IReadOnlyList<Appointment>> GetHoldsForOrdersAsync(IReadOnlyCollection<Guid> orderIds, CancellationToken cancellationToken);
}
