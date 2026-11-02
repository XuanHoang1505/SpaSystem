namespace NhuNguyetSpa.Application.DTOs.Users;

/// <summary>Shown for staff accounts so the owner sees why an account is inactive (resigned).</summary>
public sealed record UserStaffInfoDto(DateOnly HireDate, DateOnly? ResignationDate);
