using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.WorkSchedules;

namespace NhuNguyetSpa.Application.Interfaces.Services.WorkSchedules;

/// <summary>UC-SPA-24: the signed-in staff member's own shifts (docs/specs/staff.md).</summary>
public interface IMyWorkScheduleService
{
    Task<OperationResult<IReadOnlyList<MyWorkScheduleDto>>> ListAsync(MyWorkScheduleQuery query, CancellationToken cancellationToken);

    Task<OperationResult<MyWorkScheduleDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken);
}
