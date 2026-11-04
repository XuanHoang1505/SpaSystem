using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class AiChatMessageRepository : Repository<AiChatMessage>, IAiChatMessageRepository
{
    public AiChatMessageRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<AiChatMessage>> GetRecentAsync(Guid customerId, int count, CancellationToken cancellationToken)
    {
        if (count <= 0)
            return [];
        var newest = await GetPageAsync(customerId, null, count, cancellationToken);
        return newest.Reverse().ToList();
    }

    public async Task<IReadOnlyList<AiChatMessage>> GetPageAsync(Guid customerId, DateTime? beforeUtc, int take, CancellationToken cancellationToken)
    {
        var query = Set.AsNoTracking().Where(message => message.CustomerId == customerId);
        if (beforeUtc is { } before)
            query = query.Where(message => message.CreatedAtUtc < before);
        return await query
            .OrderByDescending(message => message.CreatedAtUtc)
            .ThenByDescending(message => message.Id)
            .Take(take)
            .ToListAsync(cancellationToken);
    }
}
