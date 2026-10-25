namespace NhuNguyetSpa.Application.Interfaces.Persistence;

/// <summary>
/// Commits changes tracked by repositories. Database constraint violations surface as
/// <see cref="NhuNguyetSpa.Domain.Exceptions.ConflictException"/> (for example <c>slot_unavailable</c>).
/// </summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    /// <summary>Runs <paramref name="operation"/> in one database transaction; joins the current one if already open.</summary>
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default);
}
