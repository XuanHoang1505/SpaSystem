using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.WorkSchedules;
using NhuNguyetSpa.Application.Validators.WorkSchedules;

namespace NhuNguyetSpa.Application.UseCases.WorkSchedules;

/// <summary>
/// UC-SPA-24 (BR-STF-11): only the caller's shifts, cancelled ones included (Q-72). Another staff member's shift reads as
/// <c>404 work_schedule_not_found</c>, so its existence is not revealed (BR-SEC-01).
/// </summary>
public sealed class MyWorkScheduleService : IMyWorkScheduleService
{
    private readonly IWorkScheduleRepository _shifts;
    private readonly IAppointmentRepository _appointments;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<MyWorkScheduleQuery> _validator;

    public MyWorkScheduleService(
        IWorkScheduleRepository shifts, IAppointmentRepository appointments, ICurrentUserService currentUser,
        IValidator<MyWorkScheduleQuery> validator)
    {
        _shifts = shifts;
        _appointments = appointments;
        _currentUser = currentUser;
        _validator = validator;
    }

    private Guid StaffId => _currentUser.UserId ?? throw new InvalidOperationException("The caller has no user id.");

    public async Task<OperationResult<IReadOnlyList<MyWorkScheduleDto>>> ListAsync(MyWorkScheduleQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        await _validator.ValidateAndThrowAsync(query, cancellationToken);
        ShiftRules.TryParseStatus(query.Status, out var status);
        var shifts = await _shifts.ListMineAsync(StaffId, query.FromDate!.Value, query.ToDate!.Value, status, cancellationToken);
        return OperationResult<IReadOnlyList<MyWorkScheduleDto>>.Success(shifts);
    }

    public async Task<OperationResult<MyWorkScheduleDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var staffId = StaffId;
        var shift = await _shifts.GetDtoAsync(id, cancellationToken);
        if (shift is null || shift.StaffMemberId != staffId)
            throw WorkScheduleErrors.WorkScheduleNotFound();
        var appointments = await _appointments.ListInShiftAsync(staffId, shift.Date, shift.StartTime, shift.EndTime, cancellationToken);
        return OperationResult<MyWorkScheduleDetailDto>.Success(
            new MyWorkScheduleDetailDto(shift.Id, shift.Date, shift.StartTime, shift.EndTime, shift.Status, appointments));
    }
}
