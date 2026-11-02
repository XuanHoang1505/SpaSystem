using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Users;

namespace NhuNguyetSpa.Application.Interfaces.Services.Users;

/// <summary>UC-SPA-04: the signed-in user's own account (<c>/me</c>).</summary>
public interface IProfileService
{
    Task<OperationResult<MeDto>> GetAsync(CancellationToken cancellationToken);

    Task<OperationResult<MeDto>> UpdateAsync(UpdateProfileRequest request, CancellationToken cancellationToken);

    Task ChangePasswordAsync(ChangePasswordRequest request, CancellationToken cancellationToken);

    Task<OperationResult<AvatarUrlDto>> UploadAvatarAsync(ImageUploadRequest file, CancellationToken cancellationToken);

    Task DeleteAvatarAsync(CancellationToken cancellationToken);
}
