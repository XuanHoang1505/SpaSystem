using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using NhuNguyetSpa.API.Extensions;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.DTOs.Auth;
using NhuNguyetSpa.Application.Interfaces.Services.Auth;

namespace NhuNguyetSpa.API.Controllers;

public sealed class AuthController : ApiController
{
    private readonly IAuthService _authService;
    private readonly IAccountService _accountService;
    private readonly ICurrentUserService _currentUser;

    public AuthController(IAuthService authService, IAccountService accountService, ICurrentUserService currentUser)
    {
        _authService = authService;
        _accountService = accountService;
        _currentUser = currentUser;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthenticationExtensions.AuthRateLimitPolicy)]
    [ProducesResponseType<ApiResponse<AuthResultDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _authService.LoginAsync(request, cancellationToken));

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthenticationExtensions.AuthRateLimitPolicy)]
    [ProducesResponseType<ApiResponse<AuthResultDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Refresh(RefreshTokenRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _authService.RefreshAsync(request, cancellationToken));

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedAccessException("Authenticated user has no id claim.");
        await _authService.LogoutAsync(request, userId, cancellationToken);
        return NoContent();
    }

    [HttpPost("register/request-otp")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthenticationExtensions.AuthRateLimitPolicy)]
    [ProducesResponseType<ApiResponse<OtpSentDto>>(StatusCodes.Status202Accepted)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> RequestRegistrationOtp(RegisterRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _accountService.RequestRegistrationOtpAsync(request, cancellationToken), StatusCodes.Status202Accepted);

    [HttpPost("register/verify-otp")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthenticationExtensions.AuthRateLimitPolicy)]
    [ProducesResponseType<ApiResponse<RegisteredUserDto>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status409Conflict)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> VerifyRegistrationOtp(VerifyOtpRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _accountService.VerifyRegistrationOtpAsync(request, cancellationToken), StatusCodes.Status201Created);

    [HttpPost("forgot-password/request-otp")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthenticationExtensions.AuthRateLimitPolicy)]
    [ProducesResponseType<ApiResponse<OtpSentDto>>(StatusCodes.Status202Accepted)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> RequestPasswordResetOtp(ForgotPasswordRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _accountService.RequestPasswordResetOtpAsync(request, cancellationToken), StatusCodes.Status202Accepted);

    [HttpPost("forgot-password/verify-otp")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthenticationExtensions.AuthRateLimitPolicy)]
    [ProducesResponseType<ApiResponse<PasswordResetTokenDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> VerifyPasswordResetOtp(VerifyOtpRequest request, CancellationToken cancellationToken) =>
        HandleResult(await _accountService.VerifyPasswordResetOtpAsync(request, cancellationToken));

    [HttpPost("forgot-password/reset")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthenticationExtensions.AuthRateLimitPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await _accountService.ResetPasswordAsync(request, cancellationToken);
        return NoContent();
    }
}
