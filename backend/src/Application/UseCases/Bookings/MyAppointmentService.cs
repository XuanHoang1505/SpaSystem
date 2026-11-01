using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>
/// UC-SPA-16 (docs/specs/bookings.md, wave 3): the customer's list, reschedule and cancel of their own appointments. Commands lock
/// the appointment row first, then (reschedule) the staff and customer rows through <see cref="BookingSlotReserver"/>, the same order
/// as UC-SPA-17, so a customer and the owner changing one appointment run one after the other.
/// </summary>
public sealed class MyAppointmentService : IMyAppointmentService
{
    private readonly IAppointmentRepository _appointments;
    private readonly IPurchaseRepository _purchases;
    private readonly BookingSlotReserver _reserver;
    private readonly MyAppointmentReader _reader;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<BookingOptions> _options;
    private readonly IValidator<PagedQuery> _pagingValidator;
    private readonly IValidator<MyAppointmentListQuery> _listValidator;
    private readonly IValidator<RescheduleMyAppointmentRequest> _rescheduleValidator;
    private readonly IValidator<CancelAppointmentRequest> _cancelValidator;

    public MyAppointmentService(
        IAppointmentRepository appointments,
        IPurchaseRepository purchases,
        BookingSlotReserver reserver,
        MyAppointmentReader reader,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<BookingOptions> options,
        IValidator<PagedQuery> pagingValidator,
        IValidator<MyAppointmentListQuery> listValidator,
        IValidator<RescheduleMyAppointmentRequest> rescheduleValidator,
        IValidator<CancelAppointmentRequest> cancelValidator)
    {
        _appointments = appointments;
        _purchases = purchases;
        _reserver = reserver;
        _reader = reader;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _pagingValidator = pagingValidator;
        _listValidator = listValidator;
        _rescheduleValidator = rescheduleValidator;
        _cancelValidator = cancelValidator;
    }

    private Guid CustomerId => _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized");

    public async Task<OperationResult<PagedResult<MyAppointmentListItemDto>>> ListAsync(
        PagedQuery paging, MyAppointmentListQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(paging);
        ArgumentNullException.ThrowIfNull(query);
        await _pagingValidator.ValidateAndThrowAsync(paging, cancellationToken);
        await _listValidator.ValidateAndThrowAsync(query, cancellationToken);
        MyAppointmentScopes.TryParse(query.Scope, out var scope);
        AppointmentStatusText.TryParse(query.Status, out var status);
        var criteria = new MyAppointmentSearchCriteria(scope, status, query.FromDate, query.ToDate, paging.PageNumber, paging.PageSize);
        var page = await _appointments.SearchMineAsync(CustomerId, criteria, cancellationToken);
        var items = page.Items.Select(row =>
        {
            var (canReschedule, canCancel, _) = _reader.Flags(row.Facts);
            return row.Item with { CanReschedule = canReschedule, CanCancel = canCancel };
        });
        return OperationResult<PagedResult<MyAppointmentListItemDto>>.Success(
            new PagedResult<MyAppointmentListItemDto>(items, page.PageNumber, page.PageSize, page.TotalCount));
    }

    public async Task<OperationResult<MyAppointmentDto>> RescheduleAsync(
        Guid id, RescheduleMyAppointmentRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _rescheduleValidator.ValidateAndThrowAsync(request, cancellationToken);
        var customerId = CustomerId;
        var (date, start) = (request.Date!.Value, request.StartTime!.Value);
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var (appointment, spaServiceId) = await LockMineAsync(id, customerId, token);
            var nowUtc = _clock.UtcNow;
            AppointmentChangePolicy.EnsureCanChange(appointment.Status, appointment.Date, appointment.StartTime, nowUtc,
                _options.Value.CustomerChangeCutoffHours);
            // A4: the same slot (and staff member, or "any") changes nothing.
            if (date == appointment.Date && start == appointment.StartTime &&
                (request.StaffMemberId is null || request.StaffMemberId == appointment.StaffMemberId))
                return;

            var duration = appointment.EndTime - appointment.StartTime;
            var end = start.Add(duration);
            await EnsureSourceAllowsAsync(appointment, customerId, date, start, end, nowUtc, token);
            var slot = await _reserver.ReserveAsync(customerId, spaServiceId, date, start, (int)duration.TotalMinutes, request.StaffMemberId,
                token, excludeAppointmentId: appointment.Id);
            // Read the package order again under the customer lock: a concurrent move of a neighbouring session has committed by now.
            if (appointment.TreatmentSessionId is not null)
                await EnsureSourceAllowsAsync(appointment, customerId, date, start, end, nowUtc, token);
            appointment.Reschedule(date, start, slot.End);
            appointment.AssignStaff(slot.StaffMemberId);
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
        return OperationResult<MyAppointmentDto>.Success(await _reader.GetAsync(id, customerId, cancellationToken));
    }

    public async Task<OperationResult<MyAppointmentDto>> CancelAsync(Guid id, CancelAppointmentRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _cancelValidator.ValidateAndThrowAsync(request, cancellationToken);
        var customerId = CustomerId;
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var (appointment, _) = await LockMineAsync(id, customerId, token);
            var nowUtc = _clock.UtcNow;
            AppointmentChangePolicy.EnsureCanChange(appointment.Status, appointment.Date, appointment.StartTime, nowUtc,
                _options.Value.CustomerChangeCutoffHours);
            appointment.ReleaseBookedSource();
            appointment.Cancel(request.Reason!.Trim(), nowUtc);
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
        return OperationResult<MyAppointmentDto>.Success(await _reader.GetAsync(id, customerId, cancellationToken));
    }

    /// <summary>Locks the appointment row; someone else's appointment is reported as missing (BR-SEC-01).</summary>
    private async Task<(Appointment Appointment, Guid SpaServiceId)> LockMineAsync(Guid id, Guid customerId, CancellationToken cancellationToken)
    {
        var locked = await _appointments.GetForUpdateAsync(id, cancellationToken);
        if (locked is not { } found || found.Appointment.CustomerId != customerId)
            throw BookingErrors.AppointmentNotFound();
        return found;
    }

    /// <summary>BR-BKG-16: a package session keeps the package order and dates; a bought service must not have expired.</summary>
    private async Task EnsureSourceAllowsAsync(
        Appointment appointment, Guid customerId, DateOnly date, TimeOnly start, TimeOnly end, DateTime nowUtc, CancellationToken cancellationToken)
    {
        if (appointment.TreatmentSessionId is { } sessionId)
        {
            var facts = await _purchases.GetSessionFactsAsync(sessionId, customerId, cancellationToken) ?? throw BookingErrors.TreatmentSessionNotFound();
            EntitlementEligibility.EnsureSessionReschedule(facts, date, start, end, nowUtc);
        }
        else if (appointment.ServiceEntitlement is { ExpiresAtUtc: { } expires } && expires <= nowUtc)
        {
            throw BookingErrors.EntitlementNotEligible("Dịch vụ đã hết hạn sử dụng.");
        }
    }
}
