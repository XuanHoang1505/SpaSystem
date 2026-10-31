namespace NhuNguyetSpa.Application.DTOs.Care;

/// <summary>Body of <c>POST /appointments/{id}/skin-profile</c> and <c>PUT /skin-profiles/{id}</c> (every field replaced).</summary>
public sealed record SaveSkinProfileRequest(
    string? SkinType, string? MainConcerns, string? CurrentProducts, string? CareGoals, string? RecommendedTreatment, string? Note);
