using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.ValueObjects;

/// <summary>The record a notification points to; no foreign key because the target table varies (BR-NTF-07).</summary>
public sealed record NotificationReference(NotificationReferenceType Type, Guid Id);
