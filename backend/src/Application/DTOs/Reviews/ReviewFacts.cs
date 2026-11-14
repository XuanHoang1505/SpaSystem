using NhuNguyetSpa.Application.DTOs.Catalog;

namespace NhuNguyetSpa.Application.DTOs.Reviews;

/// <summary>A service the customer bought or experienced; <see cref="Used"/>: a used entitlement or a completed package session of it.</summary>
public sealed record ReviewServiceFact(Guid ServiceId, string Name, string? ImageUrl, bool Used);

/// <summary>A package the customer bought; the highest <c>used_sessions</c> of their packages of it, any package status.</summary>
public sealed record ReviewPackageFact(Guid PackageId, string Name, string? ImageUrl, int MaxUsedSessions);

/// <summary>What review eligibility (BR-REV-01, 03) is decided from.</summary>
public sealed record ReviewFacts(
    IReadOnlyList<ReviewServiceFact> Services,
    IReadOnlyList<ReviewPackageFact> Packages,
    IReadOnlyDictionary<(CatalogItemType Type, Guid ProductId), Guid> ExistingReviewIds);
