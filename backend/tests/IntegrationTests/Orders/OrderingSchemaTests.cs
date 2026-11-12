using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NhuNguyetSpa.Infrastructure.Persistence;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Npgsql;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.Orders;

/// <summary>Constraints added by AddOrderingConstraints (docs/specs/orders.md: BR-ORD-01, BR-ORD-08, BR-PRM-04, ORD-T02).</summary>
[Collection(PostgresCollection.Name)]
public sealed class OrderingSchemaTests
{
    private readonly PostgresFixture _postgres;

    public OrderingSchemaTests(PostgresFixture postgres) => _postgres = postgres;

    [Fact]
    public async Task DuplicateCartServiceIsRejected()
    {
        var cartId = await SeedCartAsync();
        var serviceId = await SeedServiceAsync();
        await using var context = _postgres.CreateContext();
        context.CartItems.AddRange(Item(cartId, serviceId), Item(cartId, serviceId));

        var exception = await FluentActions.Invoking(() => context.SaveChangesAsync()).Should().ThrowAsync<DbUpdateException>();
        exception.Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.ConstraintName.Should().Be("ux_cart_items_cart_id_spa_service_id");
    }

    [Fact]
    public async Task SameServiceInTwoCartsIsAllowed()
    {
        var firstCart = await SeedCartAsync();
        var secondCart = await SeedCartAsync();
        var serviceId = await SeedServiceAsync();
        await using var context = _postgres.CreateContext();
        context.CartItems.AddRange(Item(firstCart, serviceId), Item(secondCart, serviceId));

        await context.SaveChangesAsync();
    }

    [Fact]
    public async Task DuplicateIdempotencyKeyPerCustomerIsRejected()
    {
        var customerId = await SeedCustomerAsync();
        var otherCustomerId = await SeedCustomerAsync();
        var key = Guid.NewGuid();
        await using (var context = _postgres.CreateContext())
        {
            context.Orders.AddRange(NewOrder(customerId, key), NewOrder(otherCustomerId, key));
            await context.SaveChangesAsync();
        }

        await using var duplicate = _postgres.CreateContext();
        duplicate.Orders.Add(NewOrder(customerId, key));
        var exception = await FluentActions.Invoking(() => duplicate.SaveChangesAsync()).Should().ThrowAsync<DbUpdateException>();
        exception.Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.ConstraintName.Should().Be("ux_orders_customer_id_idempotency_key");
    }

    [Fact]
    public async Task LowercasePromotionCodeIsRejected()
    {
        await using var context = _postgres.CreateContext();
        context.Promotions.Add(new Promotion
        {
            Code = "sale" + Guid.NewGuid().ToString("N")[..6],
            DiscountType = DiscountType.FixedAmount,
            DiscountValue = 10_000,
            StartsAtUtc = DateTime.UtcNow,
            EndsAtUtc = DateTime.UtcNow.AddDays(1),
            Status = PromotionStatus.Active,
        });

        var exception = await FluentActions.Invoking(() => context.SaveChangesAsync()).Should().ThrowAsync<DbUpdateException>();
        exception.Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.ConstraintName.Should().Be("ck_promotions_code_upper");
    }

    [Fact]
    public async Task UnitOfWorkTranslatesCartDuplicate()
    {
        var cartId = await SeedCartAsync();
        var serviceId = await SeedServiceAsync();
        await using var context = _postgres.CreateContext();
        context.CartItems.AddRange(Item(cartId, serviceId), Item(cartId, serviceId));

        var exception = await FluentActions.Invoking(() => new UnitOfWork(context).SaveChangesAsync()).Should().ThrowAsync<ConflictException>();
        exception.Which.Code.Should().Be("cart_item_exists");
    }

    [Fact]
    public async Task UnitOfWorkTranslatesDuplicatePromotionCode()
    {
        var code = "SALE" + Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();
        await using var context = _postgres.CreateContext();
        context.Promotions.AddRange(NewPromotion(code), NewPromotion(code));

        var exception = await FluentActions.Invoking(() => new UnitOfWork(context).SaveChangesAsync()).Should().ThrowAsync<ConflictException>();
        exception.Which.Code.Should().Be("promotion_code_exists");
    }

    private static Promotion NewPromotion(string code) => new()
    {
        Code = code,
        DiscountType = DiscountType.FixedAmount,
        DiscountValue = 10_000,
        StartsAtUtc = DateTime.UtcNow,
        EndsAtUtc = DateTime.UtcNow.AddDays(1),
        Status = PromotionStatus.Active,
    };

    private static CartItem Item(Guid cartId, Guid serviceId) =>
        new() { CartId = cartId, SpaServiceId = serviceId, UnitPrice = 100_000, AddedAtUtc = DateTime.UtcNow };

    /// <summary>ck_orders_cancellation, AddOrderCancellation (BR-ORD-04, ORD-T43).</summary>
    [Fact]
    public async Task CancelledStatusRequiresCancelledAt()
    {
        var order = await SeedOrderAsync();
        await using var context = _postgres.CreateContext();

        var exception = await FluentActions.Invoking(() =>
                context.Database.ExecuteSqlInterpolatedAsync($"UPDATE orders SET status = 'cancelled' WHERE id = {order.Id}"))
            .Should().ThrowAsync<PostgresException>();
        exception.Which.ConstraintName.Should().Be("ck_orders_cancellation");
    }

    [Fact]
    public async Task PaidOrderCannotHaveCancelledAt()
    {
        var order = await SeedOrderAsync();
        await using var context = _postgres.CreateContext();

        var exception = await FluentActions.Invoking(() => context.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE orders SET status = 'paid', cancelled_at_utc = now() WHERE id = {order.Id}"))
            .Should().ThrowAsync<PostgresException>();
        exception.Which.ConstraintName.Should().Be("ck_orders_cancellation");
    }

    private async Task<Order> SeedOrderAsync()
    {
        var order = NewOrder(await SeedCustomerAsync(), Guid.NewGuid());
        await using var context = _postgres.CreateContext();
        context.Orders.Add(order);
        await context.SaveChangesAsync();
        return order;
    }

    private static Order NewOrder(Guid customerId, Guid key) => new()
    {
        Code = "DH" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant(),
        CustomerId = customerId,
        Subtotal = 100_000,
        GrandTotal = 100_000,
        Status = OrderStatus.PendingPayment,
        PaymentDueAtUtc = DateTime.UtcNow.AddMinutes(15),
        IdempotencyKey = key,
    };

    private async Task<Guid> SeedCustomerAsync()
    {
        await using var context = _postgres.CreateContext();
        var unique = Guid.NewGuid().ToString("N");
        var user = new User
        {
            FullName = "Khách " + unique[..6],
            Email = $"customer-{unique}@spa.test",
            PhoneNumber = "09" + Random.Shared.NextInt64(10_000_000, 99_999_999),
            PasswordHash = "x",
            Role = UserRole.Customer,
            Status = UserStatus.Active,
        };
        context.Users.Add(user);
        context.Customers.Add(new Customer { Id = user.Id });
        await context.SaveChangesAsync();
        return user.Id;
    }

    private async Task<Guid> SeedCartAsync()
    {
        var customerId = await SeedCustomerAsync();
        await using var context = _postgres.CreateContext();
        var cart = new Cart { CustomerId = customerId };
        context.Carts.Add(cart);
        await context.SaveChangesAsync();
        return cart.Id;
    }

    private async Task<Guid> SeedServiceAsync()
    {
        await using var context = _postgres.CreateContext();
        var service = new SpaService
        {
            Name = "Dịch vụ " + Guid.NewGuid().ToString("N")[..6],
            Category = TestCategories.New(),
            DurationMinutes = 60,
            Price = 100_000,
        };
        service.ChangeStatus(CatalogStatus.OnSale);
        context.SpaServices.Add(service);
        await context.SaveChangesAsync();
        return service.Id;
    }
}
