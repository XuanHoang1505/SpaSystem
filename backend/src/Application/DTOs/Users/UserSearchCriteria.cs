using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Users;

/// <summary>Normalised <c>GET /users</c> query handed to the repository.</summary>
public sealed record UserSearchCriteria(string? Search, UserRole? Role, UserStatus? Status, int PageNumber, int PageSize);
