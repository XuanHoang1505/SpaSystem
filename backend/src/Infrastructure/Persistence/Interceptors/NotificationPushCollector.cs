using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Scoped: notifications written by this DbContext that are not committed yet (BR-NTF-10). Saved inside a transaction they wait for
/// that transaction's commit; a rollback drops them.
/// </summary>
public sealed class NotificationPushCollector
{
    private readonly List<(Guid? TransactionId, Notification Notification)> _pending = [];
    private readonly object _gate = new();

    public void Add(Guid? transactionId, IEnumerable<Notification> notifications)
    {
        lock (_gate)
            _pending.AddRange(notifications.Select(notification => (transactionId, notification)));
    }

    /// <summary>Removes and returns the notifications saved in <paramref name="transactionId"/> (null = saved without a transaction).</summary>
    public IReadOnlyList<Notification> Take(Guid? transactionId)
    {
        lock (_gate)
        {
            var taken = _pending.Where(item => item.TransactionId == transactionId).Select(item => item.Notification).ToList();
            _pending.RemoveAll(item => item.TransactionId == transactionId);
            return taken;
        }
    }

    public void Discard(Guid? transactionId) => Take(transactionId);
}
