using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Care;

namespace NhuNguyetSpa.Application.Interfaces.Services.Care;

/// <summary>UC-SPA-28: the assigned staff member marks a visit completed (docs/specs/care.md).</summary>
public interface IAppointmentCompletionService
{
    Task<OperationResult<CompleteAppointmentResult>> CompleteAsync(Guid id, CompleteAppointmentRequest request, CancellationToken cancellationToken);
}
