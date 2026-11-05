using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.RateLimiting;
using NhuNguyetSpa.API.Authentication;
using NhuNguyetSpa.API.Extensions;
using NhuNguyetSpa.API.Responses;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Auth;
using NhuNguyetSpa.Application.Interfaces.Services.Auth;
using NhuNguyetSpa.Application.UseCases.Auth;

namespace NhuNguyetSpa.API.Controllers;

public sealed class AuthController : ApiController
{
    private readonly IAuthService _authService;
    private readonly IAccountService _accountService;
    private readonly ICurrentUserService _currentUser;
    private readonly RefreshTokenCookie _cookie;

    public AuthController(IAuthService authService, IAccountService accountService, ICurrentUserService currentUser, RefreshTokenCookie cookie)
    {
        _authService = authService;
        _accountService = accountService;
        _currentUser = currentUser;
        _cookie = cookie;
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
        HandleResult(MoveRefreshTokenToCookie(await _authService.LoginAsync(request, cancellationToken)));

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthenticationExtensions.AuthRefreshRateLimitPolicy)]
    [ProducesResponseType<ApiResponse<AuthResultDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Refresh([FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] RefreshTokenRequest? request,
        CancellationToken cancellationToken)
    {
        if (!RefreshTokenCookie.IsRequested(Request))
            return HandleResult(await _authService.RefreshAsync(request ?? new RefreshTokenRequest(string.Empty), cancellationToken));

        // E2: a refused cookie is cleared so the browser stops sending it. Registered up front because the exception
        // middleware rebuilds the response (and its headers) for 401/403.
        Response.OnStarting(() =>
        {
            if (Response.StatusCode is StatusCodes.Status401Unauthorized or StatusCodes.Status403Forbidden)
                _cookie.Clear(Response);
            return Task.CompletedTask;
        });
        var token = _cookie.Read(Request) ?? throw AuthErrors.InvalidRefreshToken();
        return HandleResult(MoveRefreshTokenToCookie(await _authService.RefreshAsync(new RefreshTokenRequest(token), cancellationToken)));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ApiResponse<object>>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout([FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] RefreshTokenRequest? request,
        CancellationToken cancellationToken)
    {
        if (RefreshTokenCookie.IsRequested(Request))
        {
            // Q-69: holding the HttpOnly cookie proves ownership, so no bearer is needed and an expired access token is fine.
            var token = _cookie.Read(Request);
            if (token is not null)
                await _authService.LogoutAsync(new RefreshTokenRequest(token), null, cancellationToken);
            _cookie.Clear(Response);
            return NoContent();
        }

        // Body mode (mobile) keeps requiring the bearer token, answered by the same 401 envelope as [Authorize].
        if (_currentUser.UserId is not { } userId)
            return Challenge();
        await _authService.LogoutAsync(request ?? new RefreshTokenRequest(string.Empty), userId, cancellationToken);
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

    /// <summary>In cookie mode the refresh token goes into the HttpOnly cookie and never into the body (BR-AUTH-20).</summary>
    private OperationResult<AuthResultDto> MoveRefreshTokenToCookie(OperationResult<AuthResultDto> result)
    {
        if (!RefreshTokenCookie.IsRequested(Request) || result is not { IsSuccess: true, Data: { RefreshToken: { } token } data })
            return result;
        _cookie.Write(Response, token, data.RefreshTokenExpiresAtUtc!.Value);
        return OperationResult<AuthResultDto>.Success(data with { RefreshToken = null, RefreshTokenExpiresAtUtc = null }, result.Message);
    }
}
