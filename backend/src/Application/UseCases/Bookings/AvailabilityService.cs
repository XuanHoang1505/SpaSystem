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
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<BookingOptions> _options;
    private readonly IValidator<AvailabilityQuery> _validator;

    public AvailabilityService(
        ISpaServiceRepository services,
        IStaffMemberRepository staff,
        IWorkScheduleRepository shifts,
        IAppointmentRepository appointments,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<BookingOptions> options,
        IValidator<AvailabilityQuery> validator)
    {
        _services = services;
        _staff = staff;
        _shifts = shifts;
        _appointments = appointments;
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
        var service = await _services.GetByIdAsync(query.SpaServiceId!.Value, cancellationToken);
        if (service is null || (!isOwner && service.Status != CatalogStatus.OnSale))
            throw CatalogErrors.ServiceNotFound();

        var duration = service.DurationMinutes;
        Guid? excludeId = null;
        var customerId = HasRole(Roles.Customer) ? _currentUser.UserId : null;
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
                .Select(range => (range.Start, range.End)).Concat(customerBusy).ToList();
            var slots = AvailabilitySlots.Compute(own, blocked, duration, _options.Value.SlotStepMinutes, notAfter);
            if (slots.Count > 0)
                staff.Add(new AvailableStaffDto(candidate.StaffMemberId, candidate.FullName,
                    slots.Select(slot => new TimeSlotDto(slot.Start, slot.End)).ToList()));
        }

        return OperationResult<AvailabilityDto>.Success(new AvailabilityDto(date, duration, staff));
    }

    private bool HasRole(string role) => _currentUser.IsAuthenticated && _currentUser.Roles.Contains(role);
}
