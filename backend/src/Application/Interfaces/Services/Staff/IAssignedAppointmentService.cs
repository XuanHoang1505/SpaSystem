using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Staff;

namespace NhuNguyetSpa.Application.Interfaces.Services.Staff;

/// <summary>UC-SPA-25: the signed-in staff member's assigned appointments (docs/specs/staff.md).</summary>
public interface IAssignedAppointmentService
{
    Task<OperationResult<IReadOnlyList<AssignedAppointmentDto>>> ListAsync(AssignedAppointmentQuery query, CancellationToken cancellationToken);
}
