using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>Saved assistant turns of one customer (BR-AI-04); every read takes the customer id.</summary>
public interface IAiChatMessageRepository : IRepository<AiChatMessage>
{
    /// <summary>The newest <paramref name="count"/> turns, returned oldest first (model context).</summary>
    Task<IReadOnlyList<AiChatMessage>> GetRecentAsync(Guid customerId, int count, CancellationToken cancellationToken);

    /// <summary>Turns strictly before <paramref name="beforeUtc"/> when given, newest first (then by id), at most <paramref name="take"/>.</summary>
    Task<IReadOnlyList<AiChatMessage>> GetPageAsync(Guid customerId, DateTime? beforeUtc, int take, CancellationToken cancellationToken);
}
