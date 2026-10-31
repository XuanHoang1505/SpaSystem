using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Staff;
using NhuNguyetSpa.Application.UseCases.WorkSchedules;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>The staff member and end time a customer booking gets.</summary>
public sealed record ReservedSlot(Guid StaffMemberId, TimeOnly End);

/// <summary>
/// Step A9 for customer bookings (docs/specs/bookings.md, UC-SPA-15): re-checks A3–A7 for one slot inside the caller's transaction
/// and picks the staff member when the customer chose "any staff" (BR-BKG-14). Lock order: staff rows by id, then the customer row,
/// as in UC-SPA-17; the appointments EXCLUDE constraint still backs the staff check when the insert is saved.
/// </summary>
public sealed class BookingSlotReserver
{
    private readonly IStaffMemberRepository _staff;
    private readonly IWorkScheduleRepository _shifts;
    private readonly IAppointmentRepository _appointments;
    private readonly IDateTimeProvider _clock;

    public BookingSlotReserver(IStaffMemberRepository staff, IWorkScheduleRepository shifts, IAppointmentRepository appointments,
        IDateTimeProvider clock)
    {
        _staff = staff;
        _shifts = shifts;
        _appointments = appointments;
        _clock = clock;
    }

    public async Task<ReservedSlot> ReserveAsync(Guid customerId, Guid spaServiceId, DateOnly date, TimeOnly start, int durationMinutes,
        Guid? staffMemberId, CancellationToken cancellationToken)
    {
        var end = start.Add(TimeSpan.FromMinutes(durationMinutes), out var wrappedDays);
        if (wrappedDays > 0)
            throw BookingErrors.OutsideWorkSchedule();
        var nowUtc = _clock.UtcNow;
        if (date.ToDateTime(start) <= SpaTime.ToLocal(nowUtc))
            throw BookingErrors.InPast();

        var candidates = await _staff.GetAvailabilityCandidatesAsync(spaServiceId, date, staffMemberId, cancellationToken);
        if (staffMemberId is { } chosen && candidates.Count == 0)
            await ThrowWhyNotCandidateAsync(chosen, spaServiceId, cancellationToken);

        var shifts = await _shifts.GetActiveRangesAsync(candidates.Select(candidate => candidate.StaffMemberId).ToList(), date, date,
            cancellationToken);
        // BR-BKG-02: inside one active shift (two touching shifts do not count as one).
        var onShift = candidates
            .Where(candidate => shifts.Any(shift =>
                shift.StaffMemberId == candidate.StaffMemberId && shift.Date == date && shift.Start <= start && end <= shift.End))
            .OrderBy(candidate => candidate.StaffMemberId)
            .ToList();
        if (onShift.Count == 0)
            throw staffMemberId is null ? BookingErrors.SlotUnavailable() : BookingErrors.OutsideWorkSchedule();

        var ids = onShift.Select(candidate => candidate.StaffMemberId).ToList();
        await _staff.LockManyForBookingAsync(ids, cancellationToken);
        await _appointments.LockCustomerForBookingAsync(customerId, cancellationToken);
        foreach (var id in ids)
            await _appointments.ExpireHeldAsync(id, date, nowUtc, cancellationToken);

        var busy = await _appointments.GetOccupyingForStaffOnAsync(ids, date, nowUtc, null, cancellationToken);
        var free = onShift
            .Where(candidate => !busy.Any(range =>
                range.StaffMemberId == candidate.StaffMemberId && AppointmentOccupancy.Overlaps(range.Start, range.End, start, end)))
            .Select(candidate => (candidate, busy.Count(range => range.StaffMemberId == candidate.StaffMemberId)))
            .ToList();
        if (free.Count == 0)
            throw BookingErrors.SlotUnavailable();

        var customerBusy = await _appointments.GetCustomerOccupyingOnAsync(customerId, date, nowUtc, null, cancellationToken);
        if (customerBusy.Any(range => AppointmentOccupancy.Overlaps(range.Start, range.End, start, end)))
            throw BookingErrors.CustomerBusy();

        var picked = StaffPicker.PickLeastBusy(free)!;
        return new ReservedSlot(picked.StaffMemberId, end);
    }

    /// <summary>The chosen staff member is not a candidate (step A3): say which rule failed.</summary>
    private async Task ThrowWhyNotCandidateAsync(Guid staffMemberId, Guid spaServiceId, CancellationToken cancellationToken)
    {
        var member = (await _staff.GetWithUsersAsync([staffMemberId], cancellationToken)).SingleOrDefault();
        if (member is null || member.User.Status != UserStatus.Active)
            throw StaffErrors.StaffNotFound();
        if (!await _staff.HasSkillAsync(staffMemberId, spaServiceId, cancellationToken))
            throw BookingErrors.StaffNotQualified();
        throw BookingErrors.OutsideWorkSchedule();
    }
}
