using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Users;

public sealed record UserListItemDto(
    Guid Id,
    string FullName,
    string Email,
    string PhoneNumber,
    UserRole Role,
    UserStatus Status,
    string? AvatarUrl,
    DateTime CreatedAtUtc);
