using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Treatments;

namespace NhuNguyetSpa.Application.Interfaces.Services.Treatments;

/// <summary>UC-SPA-19: the signed-in customer's treatment plans and their sessions.</summary>
public interface IMyTreatmentService
{
    Task<OperationResult<IReadOnlyList<MyTreatmentListItemDto>>> ListAsync(MyTreatmentListQuery query, CancellationToken cancellationToken);

    Task<OperationResult<MyTreatmentPlanDto>> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<OperationResult<MyTreatmentSessionDto>> GetSessionAsync(Guid id, Guid sessionId, CancellationToken cancellationToken);
}
