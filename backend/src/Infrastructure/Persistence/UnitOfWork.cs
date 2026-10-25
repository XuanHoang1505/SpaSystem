using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Domain.Exceptions;
using Npgsql;

namespace NhuNguyetSpa.Infrastructure.Persistence;

public sealed class UnitOfWork(AppDbContext context) : IUnitOfWork
{
    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException postgres && Translate(postgres) is { } conflict)
        {
            throw conflict;
        }
    }

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(operation);
        if (context.Database.CurrentTransaction is not null)
        {
            await operation(cancellationToken);
            return;
        }

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        await operation(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    // Constraint names come from docs/domain/data-model.md; messages are shown to users, so keep them free of SQL details.
    private static ConflictException? Translate(PostgresException exception) => exception.SqlState switch
    {
        PostgresErrorCodes.ExclusionViolation when exception.ConstraintName == AppointmentConstraints.StaffNoOverlap =>
            new ConflictException("Khung giờ này vừa có người đặt, vui lòng chọn giờ khác.", "slot_unavailable"),
        PostgresErrorCodes.UniqueViolation =>
            new ConflictException("Dữ liệu đã tồn tại.", "duplicate_value"),
        _ => null,
    };
}
