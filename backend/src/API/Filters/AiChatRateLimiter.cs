using System.Threading.RateLimiting;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;

namespace NhuNguyetSpa.API.Filters;

/// <summary>
/// BR-AI-06: <c>Ai:RateLimit:PermitLimit</c> questions per window and <c>DailyLimit</c> per Vietnam day, per caller key.
/// The day is part of the partition key, so the daily count starts over at midnight in Vietnam. In memory (one server).
/// </summary>
public sealed class AiChatRateLimiter : IDisposable
{
    private readonly PartitionedRateLimiter<(string Key, DateOnly Day)> _limiter;

    public AiChatRateLimiter(IOptions<AiOptions> options)
    {
        var limits = options.Value.RateLimit;
        _limiter = PartitionedRateLimiter.CreateChained(
            PartitionedRateLimiter.Create<(string Key, DateOnly Day), string>(caller => RateLimitPartition.GetFixedWindowLimiter(
                caller.Key,
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = limits.PermitLimit, Window = TimeSpan.FromSeconds(limits.WindowSeconds), QueueLimit = 0,
                })),
            PartitionedRateLimiter.Create<(string Key, DateOnly Day), string>(caller => RateLimitPartition.GetFixedWindowLimiter(
                $"{caller.Key}|{caller.Day:yyyy-MM-dd}",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = limits.DailyLimit, Window = TimeSpan.FromDays(1), QueueLimit = 0 })));
    }

    public bool TryAcquire(string key, DateOnly vietnamDay)
    {
        using var lease = _limiter.AttemptAcquire((key, vietnamDay));
        return lease.IsAcquired;
    }

    public void Dispose() => _limiter.Dispose();
}
