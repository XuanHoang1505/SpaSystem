using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Care;

namespace NhuNguyetSpa.Application.Interfaces.Services.Care;

/// <summary>UC-SPA-26: the visits the signed-in staff member completed (docs/specs/care.md).</summary>
public interface ICareHistoryService
{
    Task<OperationResult<PagedResult<CareHistoryItemDto>>> ListAsync(
        PagedQuery paging, CareHistoryQuery query, CancellationToken cancellationToken);
}
