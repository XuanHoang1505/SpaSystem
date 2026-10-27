using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;

namespace NhuNguyetSpa.Application.Interfaces.Services.WorkSchedules;

/// <summary>UC-SPA-23 work schedule assignment (docs/specs/staff.md).</summary>
public interface IWorkScheduleService
{
    Task<OperationResult<IReadOnlyList<WorkScheduleDto>>> ListAsync(WorkScheduleQuery query, CancellationToken cancellationToken);
    Task<OperationResult<WorkScheduleDto>> CreateAsync(CreateWorkScheduleRequest request, CancellationToken cancellationToken);
    Task<OperationResult<WorkScheduleDto>> UpdateAsync(Guid id, UpdateWorkScheduleRequest request, CancellationToken cancellationToken);
    Task ChangeStatusAsync(Guid id, ChangeWorkScheduleStatusRequest request, CancellationToken cancellationToken);

    /// <summary>A4 / BR-STF-09: creates every valid shift in one transaction and reports the skipped ones with a reason.</summary>
    Task<OperationResult<WorkScheduleBatchResultDto>> CreateBatchAsync(CreateWorkScheduleBatchRequest request, CancellationToken cancellationToken);
}
