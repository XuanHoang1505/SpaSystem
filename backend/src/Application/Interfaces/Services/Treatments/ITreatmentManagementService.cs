using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Treatments;

namespace NhuNguyetSpa.Application.Interfaces.Services.Treatments;

/// <summary>UC-SPA-21: the owner (every plan) and staff (BR-TRT-06) view and change treatment plans.</summary>
public interface ITreatmentManagementService
{
    Task<OperationResult<PagedResult<TreatmentPlanListItemDto>>> ListAsync(PagedQuery paging, TreatmentListQuery query, CancellationToken cancellationToken);

    Task<OperationResult<TreatmentPlanDto>> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<OperationResult<TreatmentPlanDto>> UpdateAsync(Guid id, UpdateTreatmentPlanRequest request, CancellationToken cancellationToken);

    Task<OperationResult<TreatmentSessionDto>> UpdateSessionAsync(
        Guid id, Guid sessionId, UpdateTreatmentSessionRequest request, CancellationToken cancellationToken);

    /// <summary>Owner only, like <see cref="PauseAsync"/>, <see cref="ResumeAsync"/>, <see cref="CancelAsync"/> and <see cref="CompleteAsync"/>.</summary>
    Task<OperationResult<TreatmentPlanDto>> AssignStaffAsync(Guid id, AssignTreatmentStaffRequest request, CancellationToken cancellationToken);

    Task<OperationResult<TreatmentPlanDto>> PauseAsync(Guid id, TreatmentReasonRequest request, CancellationToken cancellationToken);

    Task<OperationResult<TreatmentPlanDto>> ResumeAsync(Guid id, CancellationToken cancellationToken);

    Task<OperationResult<TreatmentPlanDto>> CancelAsync(Guid id, TreatmentReasonRequest request, CancellationToken cancellationToken);

    Task<OperationResult<TreatmentPlanDto>> CompleteAsync(Guid id, CancellationToken cancellationToken);
}
