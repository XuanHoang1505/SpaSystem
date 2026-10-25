using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Domain.Common;

namespace NhuNguyetSpa.Infrastructure.Persistence.Interceptors;

/// <summary>Fills creation/update timestamps (UTC) and actor ids before every save.</summary>
public sealed class AuditableEntityInterceptor(IDateTimeProvider clock, ICurrentUserService currentUser) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Apply(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        Apply(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void Apply(DbContext? context)
    {
        if (context is null) return;
        var now = clock.UtcNow;
        var userId = currentUser.UserId;
        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added && entry.Entity is IHasCreatedAt created)
                created.CreatedAtUtc = now;
            if (entry.Entity is not BaseAuditableEntity auditable) continue;
            if (entry.State == EntityState.Added)
            {
                auditable.CreatedBy = userId;
            }
            else if (entry.State == EntityState.Modified)
            {
                auditable.UpdatedAtUtc = now;
                auditable.UpdatedBy = userId;
            }
        }
    }
}
