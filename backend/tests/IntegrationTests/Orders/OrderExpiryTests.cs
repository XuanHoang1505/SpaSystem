using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Payments;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Orders;

/// <summary>OrderExpiryJob's scan against PostgreSQL (docs/specs/orders.md BR-ORD-03, Q-21, ORD-T23). The job itself is off in tests.</summary>
[Collection(PostgresCollection.Name)]
public sealed class OrderExpiryTests : IAsyncLifetime
{
    private readonly PostgresFixture _postgres;
    private AuthApiFactory _factory = null!;
    private CatalogApi _api = null!;
    private OrderApi _orders = null!;

    public OrderExpiryTests(PostgresFixture postgres) => _postgres = postgres;

    public Task InitializeAsync()
    {
        _factory = new AuthApiFactory(_postgres.ConnectionString);
        _api = new CatalogApi(_factory, _postgres);
        _orders = new OrderApi(_factory, _postgres, _api);
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        _api.Client.Dispose();
        await _factory.DisposeAsync();
    }

    private async Task ExpireAsync()
    {
        using var scope = _factory.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<IOrderExpiryService>().ExpireOverdueAsync(CancellationToken.None);
    }

    private async Task<Order> ReloadAsync(Guid id)
    {
        await using var context = _postgres.CreateContext();
        return await context.Orders.Include(order => order.Payments).SingleAsync(order => order.Id == id);
    }

    [Fact]
    public async Task OrdersExpireOnlyAfterTheGracePeriod()
    {
        var customer = await _orders.SeedCustomerAsync();
        var promotion = await _orders.SeedPromotionAsync();
        var now = _factory.Clock.UtcNow;
        var pending = await _orders.SeedOrderAsync(customer, OrderStatus.PendingPayment, promotion, paymentDueAtUtc: now.AddMinutes(15));
        var paid = await _orders.SeedOrderAsync(customer, OrderStatus.Paid, paymentDueAtUtc: now.AddMinutes(15));
        await using (var context = _postgres.CreateContext())
        {
            context.Payments.Add(new Payment
            {
                OrderId = pending.Id, Provider = "vnpay", Amount = pending.GrandTotal, Status = PaymentStatus.Pending,
                RequestCode = pending.Code + "01", ExpiresAtUtc = pending.PaymentDueAtUtc,
            });
            await context.SaveChangesAsync();
        }

        _factory.Clock.Offset = TimeSpan.FromMinutes(16);
        await ExpireAsync();
        (await ReloadAsync(pending.Id)).Status.Should().Be(OrderStatus.PendingPayment, "still inside the 5-minute grace");

        _factory.Clock.Offset = TimeSpan.FromMinutes(21);
        await ExpireAsync();
        var expired = await ReloadAsync(pending.Id);
        expired.Status.Should().Be(OrderStatus.Expired);
        expired.Payments.Should().ContainSingle().Which.Status.Should().Be(PaymentStatus.Expired);
        (await ReloadAsync(paid.Id)).Status.Should().Be(OrderStatus.Paid);

        using var scope = _factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<IPromotionRepository>()
                .CountCountedRedemptionsAsync(promotion.Id, null, _factory.Clock.UtcNow, CancellationToken.None))
            .Should().Be(0, "an expired order no longer holds a promotion use");
    }

    [Fact]
    public void JobIsDisabledInTests()
    {
        _factory.Services.GetRequiredService<IOptions<OrderExpiryOptions>>().Value.Enabled.Should().BeFalse();
    }
}
