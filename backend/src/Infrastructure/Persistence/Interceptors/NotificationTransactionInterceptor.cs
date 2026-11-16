using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NhuNguyetSpa.Infrastructure.Notifications;

namespace NhuNguyetSpa.Infrastructure.Persistence.Interceptors;

/// <summary>BR-NTF-10: pushes the notifications saved in a transaction once it commits; a rollback or failure drops them.</summary>
public sealed class NotificationTransactionInterceptor : DbTransactionInterceptor
{
    private readonly NotificationPushCollector _collector;
    private readonly NotificationPushDispatcher _dispatcher;

    public NotificationTransactionInterceptor(NotificationPushCollector collector, NotificationPushDispatcher dispatcher)
    {
        _collector = collector;
        _dispatcher = dispatcher;
    }

    public override async Task TransactionCommittedAsync(DbTransaction transaction, TransactionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(eventData);
        await _dispatcher.DispatchAsync(_collector.Take(eventData.TransactionId), cancellationToken);
        await base.TransactionCommittedAsync(transaction, eventData, cancellationToken);
    }

    public override Task TransactionRolledBackAsync(DbTransaction transaction, TransactionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(eventData);
        _collector.Discard(eventData.TransactionId);
        return base.TransactionRolledBackAsync(transaction, eventData, cancellationToken);
    }

    public override Task TransactionFailedAsync(DbTransaction transaction, TransactionErrorEventData eventData,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(eventData);
        _collector.Discard(eventData.TransactionId);
        return base.TransactionFailedAsync(transaction, eventData, cancellationToken);
    }
}
