namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>Body of <c>PUT /staff/{id}</c>. Email is the login name and cannot change.</summary>
public sealed record UpdateStaffRequest(string FullName, string PhoneNumber, DateOnly? HireDate, string? Specialty);
