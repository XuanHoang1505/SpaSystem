using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Staff;

namespace NhuNguyetSpa.Application.Interfaces.Services.Staff;

/// <summary>UC-SPA-22 staff management (docs/specs/staff.md).</summary>
public interface IStaffService
{
    /// <summary>Owner list; throws <c>ForbiddenException</c> for anyone else.</summary>
    Task<OperationResult<PagedResult<StaffListItemDto>>> SearchAsync(PagedQuery query, StaffFilter filter, CancellationToken cancellationToken);

    /// <summary>Public list for booking (UC-SPA-15): working staff only, no contact details; <c>Status</c> is ignored.</summary>
    Task<OperationResult<PagedResult<PublicStaffListItemDto>>> SearchPublicAsync(PagedQuery query, StaffFilter filter, CancellationToken cancellationToken);

    Task<OperationResult<StaffDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<OperationResult<StaffDetailDto>> CreateAsync(CreateStaffRequest request, CancellationToken cancellationToken);
    Task<OperationResult<StaffDetailDto>> UpdateAsync(Guid id, UpdateStaffRequest request, CancellationToken cancellationToken);
    Task UpdateServicesAsync(Guid id, UpdateStaffServicesRequest request, CancellationToken cancellationToken);
    Task<OperationResult<ResignationResultDto>> ResignAsync(Guid id, ResignStaffRequest request, CancellationToken cancellationToken);
}
