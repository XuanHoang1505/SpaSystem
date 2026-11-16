using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Notifications;

namespace NhuNguyetSpa.Infrastructure.Persistence.Interceptors;

/// <summary>
/// BR-NTF-10: remembers the notifications a save inserts. Without an explicit transaction the save is the commit, so they are pushed
/// right after it; inside one they wait for <see cref="NotificationTransactionInterceptor"/>.
/// </summary>
public sealed class NotificationSaveInterceptor : SaveChangesInterceptor
{
    private readonly NotificationPushCollector _collector;
    private readonly NotificationPushDispatcher _dispatcher;
    private List<Notification> _saving = [];

    public NotificationSaveInterceptor(NotificationPushCollector collector, NotificationPushDispatcher dispatcher)
    {
        _collector = collector;
        _dispatcher = dispatcher;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(eventData);
        _saving = eventData.Context?.ChangeTracker.Entries<Notification>()
            .Where(entry => entry.State == EntityState.Added)
            .Select(entry => entry.Entity)
            .ToList() ?? [];
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override async ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(eventData);
        var saved = _saving;
        _saving = [];
        if (saved.Count > 0)
        {
            var transaction = eventData.Context?.Database.CurrentTransaction;
            if (transaction is null)
                await _dispatcher.DispatchAsync(saved, cancellationToken);
            else
                _collector.Add(transaction.TransactionId, saved);
        }

        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    public override Task SaveChangesFailedAsync(DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        _saving = [];
        return base.SaveChangesFailedAsync(eventData, cancellationToken);
    }
}
