using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>
/// GET /availability, steps A1–A8 of the free-slot algorithm (docs/specs/bookings.md, BR-BKG-12). The owner sees every service and
/// may pass an appointment to reschedule; a signed-in customer also loses slots that clash with their own appointments (BR-BKG-04).
/// </summary>
public sealed class AvailabilityService : IAvailabilityService
{
    private readonly ISpaServiceRepository _services;
    private readonly IStaffMemberRepository _staff;
    private readonly IWorkScheduleRepository _shifts;
    private readonly IAppointmentRepository _appointments;
    private readonly IPurchaseRepository _purchases;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<BookingOptions> _options;
    private readonly IValidator<AvailabilityQuery> _validator;

    public AvailabilityService(
        ISpaServiceRepository services,
        IStaffMemberRepository staff,
        IWorkScheduleRepository shifts,
        IAppointmentRepository appointments,
        IPurchaseRepository purchases,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<BookingOptions> options,
        IValidator<AvailabilityQuery> validator)
    {
        _services = services;
        _staff = staff;
        _shifts = shifts;
        _appointments = appointments;
        _purchases = purchases;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _validator = validator;
    }

    public async Task<OperationResult<AvailabilityDto>> GetAsync(AvailabilityQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        await _validator.ValidateAndThrowAsync(query, cancellationToken);
        var date = query.Date!.Value;
        var isOwner = HasRole(Roles.Owner);
        var customerId = HasRole(Roles.Customer) ? _currentUser.UserId : null;
        var (service, duration, extraBlocked, startsBefore) = await ResolveSourceAsync(query, isOwner, customerId, cancellationToken);
        if (extraBlocked is null)
            return OperationResult<AvailabilityDto>.Success(new AvailabilityDto(date, duration, []));

        Guid? excludeId = null;
        if (isOwner && query.AppointmentId is { } appointmentId)
        {
            // Rescheduling: keep the appointment's own length and do not let it block itself (A12).
            var appointment = await _appointments.GetDetailAsync(appointmentId, cancellationToken) ?? throw BookingErrors.AppointmentNotFound();
            duration = (int)(appointment.EndTime - appointment.StartTime).TotalMinutes;
            excludeId = appointmentId;
            customerId = appointment.Customer.Id;
        }

        var candidates = await _staff.GetAvailabilityCandidatesAsync(service.Id, date, query.StaffMemberId, cancellationToken);
        if (candidates.Count == 0)
            return OperationResult<AvailabilityDto>.Success(new AvailabilityDto(date, duration, []));

        var nowUtc = _clock.UtcNow;
        var ids = candidates.Select(candidate => candidate.StaffMemberId).ToList();
        var shifts = await _shifts.GetActiveRangesAsync(ids, date, date, cancellationToken);
        var busy = await _appointments.GetOccupyingForStaffOnAsync(ids, date, nowUtc, excludeId, cancellationToken);
        IReadOnlyList<(TimeOnly Start, TimeOnly End)> customerBusy = customerId is { } id
            ? await _appointments.GetCustomerOccupyingOnAsync(id, date, nowUtc, excludeId, cancellationToken)
            : [];
        TimeOnly? notAfter = date == SpaTime.Today(nowUtc) ? TimeOnly.FromDateTime(SpaTime.ToLocal(nowUtc)) : null;

        var staff = new List<AvailableStaffDto>();
        foreach (var candidate in candidates)
        {
            var own = shifts.Where(shift => shift.StaffMemberId == candidate.StaffMemberId).Select(shift => (shift.Start, shift.End)).ToList();
            var blocked = busy.Where(range => range.StaffMemberId == candidate.StaffMemberId)
                .Select(range => (range.Start, range.End)).Concat(customerBusy).Concat(extraBlocked).ToList();
            var slots = AvailabilitySlots.Compute(own, blocked, duration, _options.Value.SlotStepMinutes, notAfter);
            // Q-30: on the package's last day a visit must start before the expiry time.
            if (startsBefore is { } limit)
                slots = slots.Where(slot => slot.Start < limit).ToList();
            if (slots.Count > 0)
                staff.Add(new AvailableStaffDto(candidate.StaffMemberId, candidate.FullName,
                    slots.Select(slot => new TimeSlotDto(slot.Start, slot.End)).ToList()));
        }

        return OperationResult<AvailabilityDto>.Success(new AvailabilityDto(date, duration, staff));
    }

    /// <summary>
    /// The service and duration to search with. A bought service or package session (customer only, UC-SPA-15 flow 2) may use a
    /// discontinued service (Q-29); a session outside its allowed dates gives null ranges (no slot), on the previous visit's day
    /// time before that visit ends is blocked (BR-BKG-05), and on the package's last day slots must start before it expires (Q-30).
    /// </summary>
    private async Task<(SpaService Service, int Duration, IReadOnlyList<(TimeOnly Start, TimeOnly End)>? ExtraBlocked, TimeOnly? StartsBefore)> ResolveSourceAsync(
        AvailabilityQuery query, bool isOwner, Guid? customerId, CancellationToken cancellationToken)
    {
        if (query.SpaServiceId is { } spaServiceId)
        {
            var service = await _services.GetByIdAsync(spaServiceId, cancellationToken);
            if (service is null || (!isOwner && service.Status != CatalogStatus.OnSale))
                throw CatalogErrors.ServiceNotFound();
            return (service, service.DurationMinutes, [], null);
        }

        if (query.ServiceEntitlementId is { } entitlementId)
        {
            var bought = customerId is { } owner ? await _purchases.GetServiceAsync(entitlementId, owner, cancellationToken) : null;
            if (bought is null)
                throw BookingErrors.EntitlementNotFound();
            var service = await _services.GetByIdAsync(bought.SpaServiceId, cancellationToken) ?? throw BookingErrors.EntitlementNotFound();
            return (service, service.DurationMinutes, [], null);
        }

        var facts = customerId is { } customer
            ? await _purchases.GetSessionFactsAsync(query.TreatmentSessionId!.Value, customer, cancellationToken)
            : null;
        if (facts is null)
            throw BookingErrors.TreatmentSessionNotFound();
        var sessionService = await _services.GetByIdAsync(facts.SpaServiceId, cancellationToken) ?? throw BookingErrors.TreatmentSessionNotFound();
        var date = query.Date!.Value;
        var earliest = EntitlementEligibility.ForSession(facts, _clock.UtcNow).EarliestDate;
        DateTime? expiresLocal = facts.PackageExpiresAtUtc is { } expires ? SpaTime.ToLocal(expires) : null;
        if (date < earliest || (expiresLocal is { } last && date > DateOnly.FromDateTime(last)))
            return (sessionService, facts.DurationMinutes, null, null);
        TimeOnly? startsBefore = expiresLocal is { } end && date == DateOnly.FromDateTime(end) ? TimeOnly.FromDateTime(end) : null;
        if (startsBefore == TimeOnly.MinValue)
            return (sessionService, facts.DurationMinutes, null, null);
        IReadOnlyList<(TimeOnly Start, TimeOnly End)> blocked = facts.Previous is { } previous && previous.Date == date
            ? [(TimeOnly.MinValue, previous.EndTime)]
            : [];
        return (sessionService, facts.DurationMinutes, blocked, startsBefore);
    }

    private bool HasRole(string role) => _currentUser.IsAuthenticated && _currentUser.Roles.Contains(role);
}
