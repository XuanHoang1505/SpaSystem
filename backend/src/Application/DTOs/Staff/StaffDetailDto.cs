using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary><c>GET /staff/{id}</c> and the result of every staff write. Never carries a password.</summary>
public sealed record StaffDetailDto(
    Guid Id,
    string FullName,
    string Email,
    string PhoneNumber,
    string? AvatarUrl,
    string? Specialty,
    DateOnly HireDate,
    DateOnly? ResignationDate,
    UserStatus AccountStatus,
    IReadOnlyList<StaffServiceDto> Services,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);
