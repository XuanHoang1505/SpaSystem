using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Auth;

public sealed record AuthUserDto(Guid Id, string FullName, string Email, UserRole Role);
