using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Users;

/// <summary>Personal fields for <c>PUT /me</c> and <c>PUT /users/{id}</c>; replaces all four (null clears the optional ones).</summary>
public sealed record UpdateProfileRequest(string FullName, string PhoneNumber, DateOnly? DateOfBirth, Gender? Gender);
