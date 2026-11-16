using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>Notifications of one user (UC-SPA-34) and the lookups that compose new ones (docs/specs/notifications.md).</summary>
public interface INotificationRepository : IRepository<Notification>
{
    /// <summary>Newest first (created time, then id), untracked.</summary>
    Task<PagedResult<Notification>> ListForUserAsync(Guid userId, bool unreadOnly, NotificationType? type, PagedQuery paging,
        CancellationToken cancellationToken);

    /// <summary>Tracked; null when missing or another user's (BR-NTF-04).</summary>
    Task<Notification?> GetForUserAsync(Guid id, Guid userId, CancellationToken cancellationToken);

    Task<int> CountUnreadAsync(Guid userId, CancellationToken cancellationToken);

    /// <summary>Marks every unread notification of the user in one statement; returns how many changed.</summary>
    Task<int> MarkAllReadAsync(Guid userId, DateTime nowUtc, CancellationToken cancellationToken);

    /// <summary>Users with role owner and status active (BR-NTF-03).</summary>
    Task<IReadOnlyList<Guid>> GetActiveOwnerIdsAsync(CancellationToken cancellationToken);

    /// <summary>Service names (discontinued ones too) and user full names.</summary>
    Task<NoticeNames> GetNamesAsync(IReadOnlyCollection<Guid> spaServiceIds, IReadOnlyCollection<Guid> userIds, CancellationToken cancellationToken);

    /// <summary>One page of confirmed appointments dated <paramref name="fromDate"/>..<paramref name="toDate"/>, by date, start, id.</summary>
    Task<IReadOnlyList<ReminderCandidate>> GetReminderCandidatesAsync(DateOnly fromDate, DateOnly toDate, int skip, int take,
        CancellationToken cancellationToken);

    /// <summary>The keys among <paramref name="dedupKeys"/> that some notification already uses.</summary>
    Task<IReadOnlySet<string>> GetExistingDedupKeysAsync(IReadOnlyCollection<string> dedupKeys, CancellationToken cancellationToken);
}
