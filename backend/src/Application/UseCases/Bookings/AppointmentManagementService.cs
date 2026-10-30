using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;
using NhuNguyetSpa.Application.UseCases.Staff;
using NhuNguyetSpa.Application.UseCases.WorkSchedules;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>
/// UC-SPA-17 (docs/specs/bookings.md). Every command locks the appointment row and runs in one transaction; the appointments
/// EXCLUDE constraint backs the staff overlap check against concurrent writers (BR-BKG-01, translated to <c>slot_unavailable</c>).
/// </summary>
public sealed class AppointmentManagementService : IAppointmentManagementService
{
    private readonly IAppointmentRepository _appointments;
    private readonly IStaffMemberRepository _staff;
    private readonly IWorkScheduleRepository _shifts;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<BookingOptions> _options;
    private readonly IValidator<PagedQuery> _pagingValidator;
    private readonly IValidator<AppointmentListQuery> _listValidator;
    private readonly IValidator<RescheduleAppointmentRequest> _rescheduleValidator;
    private readonly IValidator<AssignAppointmentStaffRequest> _assignValidator;
    private readonly IValidator<CancelAppointmentRequest> _cancelValidator;
    private readonly IValidator<MarkNoShowRequest> _noShowValidator;

    public AppointmentManagementService(
        IAppointmentRepository appointments,
        IStaffMemberRepository staff,
        IWorkScheduleRepository shifts,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<BookingOptions> options,
        IValidator<PagedQuery> pagingValidator,
        IValidator<AppointmentListQuery> listValidator,
        IValidator<RescheduleAppointmentRequest> rescheduleValidator,
        IValidator<AssignAppointmentStaffRequest> assignValidator,
        IValidator<CancelAppointmentRequest> cancelValidator,
        IValidator<MarkNoShowRequest> noShowValidator)
    {
        _appointments = appointments;
        _staff = staff;
        _shifts = shifts;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _pagingValidator = pagingValidator;
        _listValidator = listValidator;
        _rescheduleValidator = rescheduleValidator;
        _assignValidator = assignValidator;
        _cancelValidator = cancelValidator;
        _noShowValidator = noShowValidator;
    }

    public async Task<OperationResult<PagedResult<AppointmentListItemDto>>> ListAsync(
        PagedQuery paging, AppointmentListQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(paging);
        ArgumentNullException.ThrowIfNull(query);
        await _pagingValidator.ValidateAndThrowAsync(paging, cancellationToken);
        await _listValidator.ValidateAndThrowAsync(query, cancellationToken);
        AppointmentStatusText.TryParse(query.Status, out var status);
        var search = string.IsNullOrWhiteSpace(paging.Search) ? null : paging.Search.Trim();
        var criteria = new AppointmentSearchCriteria(
            query.FromDate!.Value, query.ToDate!.Value, query.StaffMemberId, status, search, paging.PageNumber, paging.PageSize);
        return OperationResult<PagedResult<AppointmentListItemDto>>.Success(await _appointments.SearchAsync(criteria, cancellationToken));
    }

    public async Task<OperationResult<AppointmentDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var detail = await _appointments.GetDetailAsync(id, cancellationToken) ?? throw BookingErrors.AppointmentNotFound();
        // BR-SEC-01: staff read only the appointments assigned to them (UC-SPA-25 view).
        if (!HasRole(Roles.Owner) && !(HasRole(Roles.Staff) && _currentUser.UserId == detail.Staff.Id))
            throw BookingErrors.NotAssigned();
        return OperationResult<AppointmentDetailDto>.Success(detail);
    }

    public Task<OperationResult<AppointmentDetailDto>> ConfirmAsync(Guid id, CancellationToken cancellationToken) =>
        ChangeAsync(id, (appointment, _, _) =>
        {
            if (appointment.Status != AppointmentStatus.PendingConfirmation)
                throw BookingErrors.StatusInvalid(appointment.Status);
            appointment.Confirm();
            return Task.CompletedTask;
        }, cancellationToken);

    public async Task<OperationResult<AppointmentDetailDto>> RescheduleAsync(
        Guid id, RescheduleAppointmentRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _rescheduleValidator.ValidateAndThrowAsync(request, cancellationToken);
        var (date, start) = (request.Date!.Value, request.StartTime!.Value);
        return await ChangeAsync(id, async (appointment, _, token) =>
        {
            EnsureManageable(appointment);
            var now = LocalNow();
            if (StartsAt(appointment.Date, appointment.StartTime) <= now)
                throw BookingErrors.InPast();
            var end = start.Add(appointment.EndTime - appointment.StartTime, out var wrappedDays);
            if (wrappedDays > 0)
                throw BookingErrors.OutsideWorkSchedule();
            if (StartsAt(date, start) <= now)
                throw BookingErrors.InPast();

            var staff = await _staff.GetByIdAsync(appointment.StaffMemberId, token);
            if (staff is null || staff.HireDate > date || !staff.IsWorkingOn(date) || !await InsideOneShiftAsync(staff.Id, date, start, end, token))
                throw BookingErrors.OutsideWorkSchedule();

            var nowUtc = _clock.UtcNow;
            // Lock order everywhere: appointment row, staff row, customer row.
            await _staff.LockForBookingAsync(staff.Id, token);
            await _appointments.LockCustomerForBookingAsync(appointment.CustomerId, token);
            await _appointments.ExpireHeldAsync(staff.Id, date, nowUtc, token);
            var staffBusy = await _appointments.GetOccupyingForStaffOnAsync([staff.Id], date, nowUtc, appointment.Id, token);
            if (staffBusy.Any(range => AppointmentOccupancy.Overlaps(range.Start, range.End, start, end)))
                throw BookingErrors.SlotUnavailable();
            var customerBusy = await _appointments.GetCustomerOccupyingOnAsync(appointment.CustomerId, date, nowUtc, appointment.Id, token);
            if (customerBusy.Any(range => AppointmentOccupancy.Overlaps(range.Start, range.End, start, end)))
                throw BookingErrors.CustomerBusy();

            appointment.Reschedule(date, start, end);
        }, cancellationToken);
    }

    public async Task<OperationResult<AppointmentDetailDto>> AssignStaffAsync(
        Guid id, AssignAppointmentStaffRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _assignValidator.ValidateAndThrowAsync(request, cancellationToken);
        var staffMemberId = request.StaffMemberId!.Value;
        return await ChangeAsync(id, async (appointment, spaServiceId, token) =>
        {
            EnsureManageable(appointment);
            if (appointment.StaffMemberId == staffMemberId)
                return;
            var staff = (await _staff.GetWithUsersAsync([staffMemberId], token)).SingleOrDefault() ?? throw StaffErrors.StaffNotFound();
            if (StartsAt(appointment.Date, appointment.StartTime) <= LocalNow())
                throw BookingErrors.InPast();
            if (!await _staff.HasSkillAsync(staff.Id, spaServiceId, token))
                throw BookingErrors.StaffNotQualified();
            var (date, start, end) = (appointment.Date, appointment.StartTime, appointment.EndTime);
            if (staff.User.Status != UserStatus.Active || staff.HireDate > date || !staff.IsWorkingOn(date) ||
                !await InsideOneShiftAsync(staff.Id, date, start, end, token))
                throw BookingErrors.StaffNotOnShift();

            var nowUtc = _clock.UtcNow;
            await _staff.LockForBookingAsync(staff.Id, token);
            await _appointments.ExpireHeldAsync(staff.Id, date, nowUtc, token);
            var busy = await _appointments.GetOccupyingForStaffOnAsync([staff.Id], date, nowUtc, appointment.Id, token);
            if (busy.Any(range => AppointmentOccupancy.Overlaps(range.Start, range.End, start, end)))
                throw BookingErrors.StaffBusy();

            appointment.AssignStaff(staff.Id);
        }, cancellationToken);
    }

    public async Task<OperationResult<AppointmentDetailDto>> CancelAsync(Guid id, CancelAppointmentRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _cancelValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await ChangeAsync(id, (appointment, _, _) =>
        {
            EnsureManageable(appointment);
            Release(appointment);
            appointment.Cancel(request.Reason!.Trim(), _clock.UtcNow);
            return Task.CompletedTask;
        }, cancellationToken);
    }

    public async Task<OperationResult<AppointmentDetailDto>> MarkNoShowAsync(Guid id, MarkNoShowRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _noShowValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await ChangeAsync(id, (appointment, _, _) =>
        {
            if (appointment.Status != AppointmentStatus.Confirmed)
                throw BookingErrors.StatusInvalid(appointment.Status);
            if (LocalNow() < StartsAt(appointment.Date, appointment.StartTime))
                throw BookingErrors.NoShowTooEarly();
            if (_options.Value.NoShowConsumesEntitlement)
            {
                appointment.ServiceEntitlement?.Consume();
                appointment.TreatmentSession?.Skip();
            }
            else
            {
                Release(appointment);
            }

            appointment.MarkNoShow(string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim());
            return Task.CompletedTask;
        }, cancellationToken);
    }

    private async Task<OperationResult<AppointmentDetailDto>> ChangeAsync(
        Guid id, Func<Appointment, Guid, CancellationToken, Task> change, CancellationToken cancellationToken)
    {
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var (appointment, spaServiceId) = await _appointments.GetForUpdateAsync(id, token) ?? throw BookingErrors.AppointmentNotFound();
            await change(appointment, spaServiceId, token);
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
        var detail = await _appointments.GetDetailAsync(id, cancellationToken) ?? throw BookingErrors.AppointmentNotFound();
        return OperationResult<AppointmentDetailDto>.Success(detail);
    }

    /// <summary>BR-BKG-02: [start, end) lies inside one active shift (two touching shifts do not count as one).</summary>
    private async Task<bool> InsideOneShiftAsync(Guid staffMemberId, DateOnly date, TimeOnly start, TimeOnly end, CancellationToken cancellationToken)
    {
        var shifts = await _shifts.GetActiveRangesAsync([staffMemberId], date, date, cancellationToken);
        return shifts.Any(shift => shift.StaffMemberId == staffMemberId && shift.Date == date && shift.Start <= start && end <= shift.End);
    }

    /// <summary>BR-BKG-10: the entitlement or session used to book becomes bookable again.</summary>
    private static void Release(Appointment appointment)
    {
        appointment.ServiceEntitlement?.Release();
        appointment.TreatmentSession?.Release();
    }

    private static void EnsureManageable(Appointment appointment)
    {
        if (!appointment.CanBeManaged)
            throw BookingErrors.StatusInvalid(appointment.Status);
    }

    private DateTime LocalNow() => SpaTime.ToLocal(_clock.UtcNow);

    private static DateTime StartsAt(DateOnly date, TimeOnly time) => date.ToDateTime(time);

    private bool HasRole(string role) => _currentUser.IsAuthenticated && _currentUser.Roles.Contains(role);
}
