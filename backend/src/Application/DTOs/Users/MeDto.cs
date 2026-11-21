using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Users;

/// <summary>The signed-in user's own account (<c>GET /me</c>, UC-SPA-04). Never carries the password hash; <c>HasPassword</c> is false for a Google-only account (Q-84).</summary>
public sealed record MeDto(
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
    bool HasPassword);
