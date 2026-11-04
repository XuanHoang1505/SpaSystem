using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Services.Payments;

namespace NhuNguyetSpa.Infrastructure.BackgroundJobs;

/// <summary>
/// Hosted service for BR-ORD-03: every <c>OrderExpiry:IntervalSeconds</c> it expires unpaid orders past due + grace.
/// A failed scan is logged and retried next time; it never stops the API.
/// </summary>
public sealed class OrderExpiryJob : BackgroundService
{
    private readonly IServiceScopeFactory _scopes;
    private readonly IOptions<OrderExpiryOptions> _options;
    private readonly ILogger<OrderExpiryJob> _logger;

    public OrderExpiryJob(IServiceScopeFactory scopes, IOptions<OrderExpiryOptions> options, ILogger<OrderExpiryJob> logger)
    {
        _scopes = scopes;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var options = _options.Value;
        if (!options.Enabled)
            return;

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(options.IntervalSeconds));
        do
        {
            try
            {
                await using var scope = _scopes.CreateAsyncScope();
                var expired = await scope.ServiceProvider.GetRequiredService<IOrderExpiryService>().ExpireOverdueAsync(stoppingToken);
                if (expired > 0)
                    _logger.LogInformation("Expired {Count} unpaid orders.", expired);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Order expiry scan failed; retrying on the next tick.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
