namespace NhuNguyetSpa.Application.DTOs.Care;

/// <summary>Body of <c>POST /customers/{id}/allergies</c> and <c>PUT /customers/{id}/allergies/{allergyId}</c>.</summary>
public sealed record SaveAllergyRequest(string? Allergen, string? Severity, string? Note);
