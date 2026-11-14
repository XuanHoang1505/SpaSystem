namespace NhuNguyetSpa.Application.DTOs.Reviews;

/// <summary>Body of <c>POST /me/reviews</c>: exactly one product id (UC-SPA-30).</summary>
public sealed record CreateReviewRequest(Guid? SpaServiceId, Guid? ServicePackageId, int Rating, string? Comment);

/// <summary>Body of <c>PUT /me/reviews/{id}</c> (BR-REV-04).</summary>
public sealed record UpdateReviewRequest(int Rating, string? Comment);

/// <summary>Body of <c>POST /reviews/{id}/reply</c> (BR-REV-08).</summary>
public sealed record ReplyReviewRequest(string? Reply);

/// <summary>Body of <c>PATCH /reviews/{id}/visibility</c>: <c>visible</c> or <c>hidden</c>.</summary>
public sealed record ChangeReviewVisibilityRequest(string? Status);
