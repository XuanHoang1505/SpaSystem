using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Auth;

namespace NhuNguyetSpa.Application.Interfaces.Services.Auth;

/// <summary>Sign-in with Google on the web (docs/specs/auth.md, Q-84). Sessions are the same as a password login.</summary>
public interface IGoogleSignInService
{
    /// <summary>Signs in the linked (or same-email) account, or returns the sign-up step for a new customer.</summary>
    Task<OperationResult<GoogleSignInResultDto>> SignInAsync(GoogleSignInRequest request, CancellationToken cancellationToken);

    /// <summary>Creates the customer account of a first Google sign-in (with its phone number) and signs it in.</summary>
    Task<OperationResult<AuthResultDto>> CompleteSignupAsync(GoogleSignupCompleteRequest request, CancellationToken cancellationToken);
}
