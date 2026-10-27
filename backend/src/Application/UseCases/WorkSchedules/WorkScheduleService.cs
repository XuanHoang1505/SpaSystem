using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.WorkSchedules;
using NhuNguyetSpa.Application.UseCases.Staff;
using NhuNguyetSpa.Application.Validators.WorkSchedules;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.WorkSchedules;

/// <summary>UC-SPA-23 work schedule assignment (docs/specs/staff.md). The database EXCLUDE constraint backs the overlap check.</summary>
public sealed class WorkScheduleService : IWorkScheduleService
{
    private readonly IWorkScheduleRepository _shifts;
    private readonly IStaffMemberRepository _staff;
    private readonly IAppointmentRepository _appointments;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<WorkScheduleOptions> _options;
    private readonly IValidator<WorkScheduleQuery> _queryValidator;
    private readonly IValidator<CreateWorkScheduleRequest> _createValidator;
    private readonly IValidator<UpdateWorkScheduleRequest> _updateValidator;
    private readonly IValidator<ChangeWorkScheduleStatusRequest> _statusValidator;
    private readonly IValidator<CreateWorkScheduleBatchRequest> _batchValidator;

    public WorkScheduleService(
        IWorkScheduleRepository shifts,
        IStaffMemberRepository staff,
        IAppointmentRepository appointments,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        IOptions<WorkScheduleOptions> options,
        IValidator<WorkScheduleQuery> queryValidator,
        IValidator<CreateWorkScheduleRequest> createValidator,
        IValidator<UpdateWorkScheduleRequest> updateValidator,
        IValidator<ChangeWorkScheduleStatusRequest> statusValidator,
        IValidator<CreateWorkScheduleBatchRequest> batchValidator)
    {
        _shifts = shifts;
        _staff = staff;
        _appointments = appointments;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _options = options;
        _queryValidator = queryValidator;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _statusValidator = statusValidator;
        _batchValidator = batchValidator;
    }

    public async Task<OperationResult<IReadOnlyList<WorkScheduleDto>>> ListAsync(WorkScheduleQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        await _queryValidator.ValidateAndThrowAsync(query, cancellationToken);
        if (query.StaffMemberId is { } staffMemberId && await _staff.GetByIdAsync(staffMemberId, cancellationToken) is null)
            throw StaffErrors.StaffNotFound();
        ShiftRules.TryParseStatus(query.Status, out var status);
        var shifts = await _shifts.ListAsync(query.FromDate!.Value, query.ToDate!.Value, query.StaffMemberId, status, cancellationToken);
        return OperationResult<IReadOnlyList<WorkScheduleDto>>.Success(shifts);
    }

    public async Task<OperationResult<WorkScheduleDto>> CreateAsync(CreateWorkScheduleRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);
        var staff = await _staff.GetByIdAsync(request.StaffMemberId!.Value, cancellationToken) ?? throw StaffErrors.StaffNotFound();
        var (date, start, end) = (request.Date!.Value, request.StartTime!.Value, request.EndTime!.Value);
        await EnsureSchedulableAsync(staff, date, start, end, excludeId: null, cancellationToken);

        var shift = WorkSchedule.Create(staff.Id, date, start, end);
        await _shifts.AddAsync(shift, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ResultAsync(shift.Id, cancellationToken);
    }

    public async Task<OperationResult<WorkScheduleDto>> UpdateAsync(Guid id, UpdateWorkScheduleRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var shift = await _shifts.GetByIdAsync(id, cancellationToken) ?? throw WorkScheduleErrors.WorkScheduleNotFound();
        if (shift.Status == WorkScheduleStatus.Cancelled)
            throw WorkScheduleErrors.ShiftCancelled();
        if (shift.Date < Today)
            throw WorkScheduleErrors.ShiftInPast();
        var staff = await _staff.GetByIdAsync(shift.StaffMemberId, cancellationToken) ?? throw StaffErrors.StaffNotFound();
        var (date, start, end) = (request.Date!.Value, request.StartTime!.Value, request.EndTime!.Value);
        await EnsureSchedulableAsync(staff, date, start, end, shift.Id, cancellationToken);

        // Appointments inside the old shift must still sit wholly inside the new one (BR-STF-03, BR-BKG-02).
        var stranded = (await AppointmentsInsideAsync(shift, cancellationToken))
            .Count(slot => date != shift.Date || slot.Start < start || slot.End > end);
        if (stranded > 0)
            throw WorkScheduleErrors.ShiftHasAppointments(stranded);

        shift.Reschedule(date, start, end);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await ResultAsync(shift.Id, cancellationToken);
    }

    public async Task ChangeStatusAsync(Guid id, ChangeWorkScheduleStatusRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _statusValidator.ValidateAndThrowAsync(request, cancellationToken);
        var shift = await _shifts.GetByIdAsync(id, cancellationToken) ?? throw WorkScheduleErrors.WorkScheduleNotFound();
        if (shift.Status == WorkScheduleStatus.Cancelled)
            return;
        if (shift.Date < Today)
            throw WorkScheduleErrors.ShiftInPast();
        var inside = (await AppointmentsInsideAsync(shift, cancellationToken)).Count;
        if (inside > 0)
            throw WorkScheduleErrors.ShiftHasAppointments(inside);

        shift.Cancel();
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<OperationResult<WorkScheduleBatchResultDto>> CreateBatchAsync(CreateWorkScheduleBatchRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _batchValidator.ValidateAndThrowAsync(request, cancellationToken);
        var staffIds = request.StaffMemberIds!;
        var members = await _staff.GetWithUsersAsync(staffIds, cancellationToken);
        if (members.Count != staffIds.Count)
            throw StaffErrors.StaffNotFound();
        var (from, to, start, end) = (request.FromDate!.Value, request.ToDate!.Value, request.StartTime!.Value, request.EndTime!.Value);
        var existing = (await _shifts.GetActiveRangesAsync(staffIds, from, to, cancellationToken)).ToLookup(range => (range.StaffMemberId, range.Date));
        var today = Today;

        var created = new List<WorkSchedule>();
        var skipped = new List<SkippedShiftDto>();
        foreach (var member in members)
        {
            foreach (var date in ShiftRules.Days(from, to, request.Weekdays))
            {
                // Same checks and order as a single create (BR-STF-06, then BR-STF-03); each failure skips one shift only.
                var reason = DateRejection(member, date, today)
                    ?? (existing[(member.Id, date)].Any(range => AppointmentOccupancy.Overlaps(range.Start, range.End, start, end))
                        ? WorkScheduleErrors.ShiftConflictCode
                        : null);
                if (reason is null)
                    created.Add(WorkSchedule.Create(member.Id, date, start, end));
                else
                    skipped.Add(new SkippedShiftDto(member.Id, member.User.FullName, date, reason));
            }
        }

        if (created.Count > 0)
        {
            // One transaction: a concurrent overlapping insert trips the EXCLUDE constraint and nothing is saved (409 shift_conflict).
            await _unitOfWork.ExecuteInTransactionAsync(async token =>
            {
                foreach (var shift in created)
                    await _shifts.AddAsync(shift, token);
                await _unitOfWork.SaveChangesAsync(token);
            }, cancellationToken);
        }

        var names = members.ToDictionary(member => member.Id, member => member.User.FullName);
        var createdDtos = created
            .Select(shift => new WorkScheduleDto(shift.Id, shift.StaffMemberId, names[shift.StaffMemberId], shift.Date, shift.StartTime, shift.EndTime, shift.Status))
            .OrderBy(shift => shift.Date).ThenBy(shift => shift.StartTime).ThenBy(shift => shift.StaffName, StringComparer.CurrentCulture)
            .ToList();
        var skippedSorted = skipped.OrderBy(skip => skip.Date).ThenBy(skip => skip.StaffName, StringComparer.CurrentCulture).ToList();
        return OperationResult<WorkScheduleBatchResultDto>.Success(new WorkScheduleBatchResultDto(createdDtos, skippedSorted));
    }

    private DateOnly Today => SpaTime.Today(_clock.UtcNow);

    /// <summary>BR-STF-06 date window, hire/resignation dates, then BR-STF-03 overlap with other active shifts.</summary>
    private async Task EnsureSchedulableAsync(StaffMember staff, DateOnly date, TimeOnly start, TimeOnly end, Guid? excludeId, CancellationToken cancellationToken)
    {
        switch (DateRejection(staff, date, Today))
        {
            case WorkScheduleErrors.ShiftDateOutOfRangeCode:
                throw WorkScheduleErrors.ShiftDateOutOfRange(_options.Value.MaxDaysAhead);
            case WorkScheduleErrors.ShiftBeforeHireDateCode:
                throw WorkScheduleErrors.ShiftBeforeHireDate();
            case WorkScheduleErrors.StaffResignedCode:
                throw WorkScheduleErrors.StaffResigned();
        }
        if (await _shifts.HasActiveOverlapAsync(staff.Id, date, start, end, excludeId, cancellationToken))
            throw WorkScheduleErrors.ShiftConflict();
    }

    /// <summary>BR-STF-06 for one day: the error code that rules the date out for this staff member, or null.</summary>
    private string? DateRejection(StaffMember staff, DateOnly date, DateOnly today)
    {
        if (date < today || date > today.AddDays(_options.Value.MaxDaysAhead))
            return WorkScheduleErrors.ShiftDateOutOfRangeCode;
        if (date < staff.HireDate)
            return WorkScheduleErrors.ShiftBeforeHireDateCode;
        if (!staff.IsWorkingOn(date))
            return WorkScheduleErrors.StaffResignedCode;
        return null;
    }

    private async Task<IReadOnlyList<(TimeOnly Start, TimeOnly End)>> AppointmentsInsideAsync(WorkSchedule shift, CancellationToken cancellationToken)
    {
        var slots = await _appointments.GetOccupyingOnAsync(shift.StaffMemberId, shift.Date, _clock.UtcNow, cancellationToken);
        return slots.Where(slot => AppointmentOccupancy.Overlaps(slot.Start, slot.End, shift.StartTime, shift.EndTime)).ToList();
    }

    private async Task<OperationResult<WorkScheduleDto>> ResultAsync(Guid id, CancellationToken cancellationToken) =>
        OperationResult<WorkScheduleDto>.Success(await _shifts.GetDtoAsync(id, cancellationToken) ?? throw WorkScheduleErrors.WorkScheduleNotFound());
}
