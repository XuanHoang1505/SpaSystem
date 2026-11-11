using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

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
    /// UC-SPA-25: the staff member's appointments dated in [<paramref name="from"/>, <paramref name="to"/>], without held or
    /// hold-expired ones (BR-STF-10), ordered by date, start time, id.
    /// </summary>
    Task<IReadOnlyList<AssignedAppointmentDto>> ListAssignedAsync(
        Guid staffMemberId, DateOnly from, DateOnly to, AppointmentStatus? status, CancellationToken cancellationToken);

    /// <summary>
    /// UC-SPA-24: the staff member's appointments on <paramref name="date"/> overlapping [<paramref name="start"/>,
    /// <paramref name="end"/>) with a status of <c>ShiftAppointments.ShownStatuses</c> (BR-STF-11), by start time.
    /// </summary>
    Task<IReadOnlyList<ShiftAppointmentDto>> ListInShiftAsync(
        Guid staffMemberId, DateOnly date, TimeOnly start, TimeOnly end, CancellationToken cancellationToken);

    /// <summary>
    /// UC-SPA-26 (BR-CARE-07): the staff member's <c>completed</c> appointments matching <paramref name="criteria"/>, newest first;
    /// the search matches the customer's name ignoring case and accents, or part of the phone number.
    /// </summary>
    Task<PagedResult<CareHistoryItemDto>> SearchCareHistoryAsync(
        Guid staffMemberId, CareHistoryCriteria criteria, CancellationToken cancellationToken);

    /// <summary>
    /// Locks the appointment row (<c>FOR UPDATE</c>, so call inside a transaction) and returns it tracked with its entitlement
    /// and treatment session, plus its derived service id; null when it does not exist.
    /// </summary>
    Task<(Appointment Appointment, Guid SpaServiceId)?> GetForUpdateAsync(Guid id, CancellationToken cancellationToken);

    Task<Guid?> GetSpaServiceIdAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Owner, staff, status and time of the appointment for the care use cases; null when it does not exist.</summary>
    Task<AppointmentCareInfo?> GetCareInfoAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>
    /// BR-CARE-06: the staff member has (had) an appointment with the customer in <c>pending_confirmation</c>, <c>confirmed</c>
    /// or <c>completed</c>.
    /// </summary>
    Task<bool> IsInCareAsync(Guid staffMemberId, Guid customerId, CancellationToken cancellationToken);

    /// <summary>Whether the appointment already has its skin profile (UC-SPA-27, UC-SPA-28 Q-35).</summary>
    Task<bool> HasSkinProfileAsync(Guid appointmentId, CancellationToken cancellationToken);

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

    /// <summary>UC-SPA-20: the customer's completed and no-show visits only, newest first; the service is derived (Q-25).</summary>
    Task<PagedResult<ServiceHistoryItemDto>> SearchHistoryAsync(Guid customerId, ServiceHistoryCriteria criteria, CancellationToken cancellationToken);

    /// <summary>Null when the appointment is someone else's or neither completed nor no-show.</summary>
    Task<ServiceHistoryDetailDto?> GetHistoryDetailAsync(Guid customerId, Guid appointmentId, CancellationToken cancellationToken);

    /// <summary>
    /// UC-SPA-16: the customer's appointments in the scope's statuses (BR-BKG-17); upcoming by date and start time ascending, the
    /// other scopes (and no scope) newest first. The service is derived (Q-25).
    /// </summary>
    Task<PagedResult<(MyAppointmentListItemDto Item, AppointmentChangeFacts Facts)>> SearchMineAsync(
        Guid customerId, MyAppointmentSearchCriteria criteria, CancellationToken cancellationToken);

    /// <summary>The customer's own appointment (UC-SPA-15/16); null when missing or someone else's.</summary>
    Task<MyAppointmentRow?> GetMineAsync(Guid id, Guid customerId, CancellationToken cancellationToken);

    /// <summary>
    /// Book-now appointments (tracked) whose order line belongs to one of <paramref name="orderIds"/>, held or hold-expired;
    /// used when the order is paid, fails or expires (BR-BKG-06).
    /// </summary>
    Task<IReadOnlyList<Appointment>> GetHoldsForOrdersAsync(IReadOnlyCollection<Guid> orderIds, CancellationToken cancellationToken);
}
