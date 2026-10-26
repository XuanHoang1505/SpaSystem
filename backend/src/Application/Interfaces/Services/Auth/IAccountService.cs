using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Auth;

namespace NhuNguyetSpa.Application.Interfaces.Services.Auth;

/// <summary>UC-SPA-01 and UC-SPA-03 (docs/specs/auth.md). Failures throw domain exceptions with the spec's error codes.</summary>
public interface IAccountService
{
    Task<OperationResult<OtpSentDto>> RequestRegistrationOtpAsync(RegisterRequest request, CancellationToken cancellationToken);

    Task<OperationResult<RegisteredUserDto>> VerifyRegistrationOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken);

    /// <summary>Always succeeds with the same body, whether or not the account exists (BR-AUTH-05).</summary>
    Task<OperationResult<OtpSentDto>> RequestPasswordResetOtpAsync(ForgotPasswordRequest request, CancellationToken cancellationToken);

    Task<OperationResult<PasswordResetTokenDto>> VerifyPasswordResetOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken);

    Task ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken);
}
