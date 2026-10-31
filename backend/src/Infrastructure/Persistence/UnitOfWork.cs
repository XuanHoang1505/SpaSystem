using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.UseCases.Care;
using NhuNguyetSpa.Domain.Exceptions;
using Npgsql;

namespace NhuNguyetSpa.Infrastructure.Persistence;

public sealed class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;

    public UnitOfWork(AppDbContext context) => _context = context;

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException postgres && Translate(postgres) is { } conflict)
        {
            throw conflict;
        }
    }

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(operation);
        if (_context.Database.CurrentTransaction is not null)
        {
            await operation(cancellationToken);
            return;
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        await operation(cancellationToken);
        // The operation may have had a side effect that cannot be undone (staff credentials mail, BR-STF-08), so a client
        // disconnecting at this point must not roll the work back.
        await transaction.CommitAsync(CancellationToken.None);
    }

    // Constraint names come from docs/domain/data-model.md; messages are shown to users, so keep them free of SQL details.
    private static ConflictException? Translate(PostgresException exception) => exception.SqlState switch
    {
        PostgresErrorCodes.ExclusionViolation when exception.ConstraintName == AppointmentConstraints.StaffNoOverlap =>
            new ConflictException("Khung giờ này vừa có người đặt, vui lòng chọn giờ khác.", "slot_unavailable"),
        PostgresErrorCodes.ExclusionViolation when exception.ConstraintName == WorkScheduleConstraints.NoOverlap =>
            new ConflictException("Ca làm bị chồng với một ca khác của nhân viên trong ngày.", "shift_conflict"),
        PostgresErrorCodes.UniqueViolation when exception.ConstraintName is CartItemIndexes.UniqueService or CartItemIndexes.UniquePackage =>
            new ConflictException("Sản phẩm này đã có trong giỏ hàng.", "cart_item_exists"),
        PostgresErrorCodes.UniqueViolation when exception.ConstraintName == Configurations.PromotionConfiguration.UniqueCode =>
            new ConflictException("Mã khuyến mãi đã tồn tại.", "promotion_code_exists"),
        PostgresErrorCodes.UniqueViolation when exception.ConstraintName == Configurations.SkinProfileConfiguration.UniqueAppointment =>
            new ConflictException(CareErrors.SkinProfileExistsMessage, CareErrors.SkinProfileExistsCode),
        PostgresErrorCodes.UniqueViolation =>
            new ConflictException("Dữ liệu đã tồn tại.", "duplicate_value"),
        _ => null,
    };
}
