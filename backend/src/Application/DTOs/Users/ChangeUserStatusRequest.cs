using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Users;

/// <summary><c>PATCH /users/{id}/status</c>: only <c>active</c> or <c>locked</c> (BR-AUTH-18).</summary>
public sealed record ChangeUserStatusRequest(UserStatus? Status);
