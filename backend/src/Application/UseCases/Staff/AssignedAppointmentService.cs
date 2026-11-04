using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Staff;
using NhuNguyetSpa.Application.UseCases.Bookings;

namespace NhuNguyetSpa.Application.UseCases.Staff;

/// <summary>UC-SPA-25 (docs/specs/staff.md BR-STF-10): only the caller's appointments, without held ones (BR-SEC-01, Q-33).</summary>
public sealed class AssignedAppointmentService : IAssignedAppointmentService
{
    private readonly IAppointmentRepository _appointments;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<AssignedAppointmentQuery> _validator;

    public AssignedAppointmentService(
        IAppointmentRepository appointments, ICurrentUserService currentUser, IValidator<AssignedAppointmentQuery> validator)
    {
        _appointments = appointments;
        _currentUser = currentUser;
        _validator = validator;
    }

    public async Task<OperationResult<IReadOnlyList<AssignedAppointmentDto>>> ListAsync(
        AssignedAppointmentQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        await _validator.ValidateAndThrowAsync(query, cancellationToken);
        AppointmentStatusText.TryParse(query.Status, out var status);
        var staffId = _currentUser.UserId ?? throw new InvalidOperationException("The caller has no user id.");
        var rows = await _appointments.ListAssignedAsync(staffId, query.FromDate!.Value, query.ToDate!.Value, status, cancellationToken);
        return OperationResult<IReadOnlyList<AssignedAppointmentDto>>.Success(rows);
    }
}
