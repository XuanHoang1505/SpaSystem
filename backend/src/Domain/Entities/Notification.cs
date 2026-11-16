using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.ValueObjects;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>notifications</c> (thesis: ThongBao). See docs/domain/data-model.md and docs/specs/notifications.md.</summary>
public sealed class Notification : BaseEntity, IHasCreatedAt
{
    public const int TitleMaxLength = 200;
    public const int DedupKeyMaxLength = 150;

    public Guid UserId { get; private set; }
    public User User { get; set; } = null!;
    public string Title { get; private set; } = string.Empty;
    public string Body { get; private set; } = string.Empty;
    public NotificationType Type { get; private set; }
    public NotificationReferenceType? ReferenceType { get; private set; }
    public Guid? ReferenceId { get; private set; }
    /// <summary>Stops a second copy of the same notice, for example one reminder per appointment time (BR-NTF-06).</summary>
    public string? DedupKey { get; private set; }
    public DateTime? ReadAtUtc { get; private set; }
    public DateTime CreatedAtUtc { get; set; }

    public static Notification Create(Guid userId, NotificationType type, string title, string body, NotificationReference? reference,
        string? dedupKey, DateTime nowUtc)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Length > TitleMaxLength)
            throw new ArgumentException($"A notification title is 1-{TitleMaxLength} characters.", nameof(title));
        if (string.IsNullOrWhiteSpace(body))
            throw new ArgumentException("A notification needs a body.", nameof(body));
        if (dedupKey is { Length: > DedupKeyMaxLength })
            throw new ArgumentException($"A dedup key is at most {DedupKeyMaxLength} characters.", nameof(dedupKey));
        return new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Body = body,
            ReferenceType = reference?.Type,
            ReferenceId = reference?.Id,
            DedupKey = dedupKey,
            CreatedAtUtc = nowUtc,
        };
    }

    /// <summary>Records the first read only (BR-NTF-04); returns whether anything changed.</summary>
    public bool MarkRead(DateTime nowUtc)
    {
        if (ReadAtUtc is not null)
            return false;
        ReadAtUtc = nowUtc;
        return true;
    }
}
