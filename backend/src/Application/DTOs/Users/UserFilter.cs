namespace NhuNguyetSpa.Application.DTOs.Users;

/// <summary>Query-string filters for <c>GET /users</c>; <c>search</c> comes from <c>PagedQuery</c>. Values are snake_case enum names.</summary>
public sealed class UserFilter
{
    public string? Role { get; set; }
    public string? Status { get; set; }
}
