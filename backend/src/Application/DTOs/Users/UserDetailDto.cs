using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Users;

/// <summary><c>GET /users/{id}</c> (UC-SPA-05). <see cref="Staff"/> is null unless the account is a staff member.</summary>
public sealed record UserDetailDto(
    Guid Id,
    string FullName,
    string Email,
    string PhoneNumber,
    UserRole Role,
    UserStatus Status,
    string? AvatarUrl,
    DateOnly? DateOfBirth,
    Gender? Gender,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc,
    UserStaffInfoDto? Staff);
