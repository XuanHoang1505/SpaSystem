using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Care;

namespace NhuNguyetSpa.Application.Interfaces.Services.Care;

/// <summary>UC-SPA-27: the skin profile of one visit (docs/specs/care.md).</summary>
public interface ISkinProfileService
{
    Task<OperationResult<SkinProfileDto>> GetByAppointmentAsync(Guid appointmentId, CancellationToken cancellationToken);

    Task<OperationResult<SkinProfileDto>> CreateAsync(Guid appointmentId, SaveSkinProfileRequest request, CancellationToken cancellationToken);

    Task<OperationResult<SkinProfileDto>> UpdateAsync(Guid id, SaveSkinProfileRequest request, CancellationToken cancellationToken);
}
