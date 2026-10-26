using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Auth;

namespace NhuNguyetSpa.Application.Interfaces.Services.Auth;

/// <summary>UC-SPA-02 (docs/specs/auth.md). Failures throw Unauthorized/Forbidden/Validation exceptions.</summary>
public interface IAuthService
{
    Task<OperationResult<AuthResultDto>> LoginAsync(LoginRequest request, CancellationToken cancellationToken);

    Task<OperationResult<AuthResultDto>> RefreshAsync(RefreshTokenRequest request, CancellationToken cancellationToken);

    /// <summary>Revokes the token only if it belongs to <paramref name="currentUserId"/>; never reveals whether it existed.</summary>
    Task LogoutAsync(RefreshTokenRequest request, Guid currentUserId, CancellationToken cancellationToken);
}
