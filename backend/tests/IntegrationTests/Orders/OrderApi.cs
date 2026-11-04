using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;

namespace NhuNguyetSpa.IntegrationTests.Orders;

/// <summary>
/// Seeding helpers for promotion, cart, order and payment tests (HTTP helpers come from <see cref="CatalogApi"/>). Orders and
/// redemptions are inserted directly when a test only needs them as background rows.
/// </summary>
public sealed class OrderApi
{
    private readonly AuthApiFactory _factory;
    private readonly PostgresFixture _postgres;
    private readonly CatalogApi _api;

    public OrderApi(AuthApiFactory factory, PostgresFixture postgres, CatalogApi api)
    {
        _factory = factory;
        _postgres = postgres;
        _api = api;
    }

    public static string NewCode() => "KM" + Guid.NewGuid().ToString("N")[..10].ToUpperInvariant();

    public async Task AddToCartAsync(string token, Guid? spaServiceId = null, Guid? servicePackageId = null)
    {
        var (response, _) = await _api.SendJsonAsync(HttpMethod.Post, "/api/v1/me/cart/items", new { spaServiceId, servicePackageId }, token);
        if (response.StatusCode != System.Net.HttpStatusCode.Created)
            throw new InvalidOperationException($"Adding to cart failed: {response.StatusCode}");
    }

    public Task<(HttpResponseMessage Response, System.Text.Json.JsonDocument Body)> CreateOrderAsync(
        string token, object body, string? idempotencyKey = null)
    {
        var content = System.Net.Http.Json.JsonContent.Create(body);
        if (idempotencyKey is not null)
            content.Headers.Add("Idempotency-Key", idempotencyKey);
        return _api.SendAsync(HttpMethod.Post, "/api/v1/me/orders", content, token);
    }

    public Task<(HttpResponseMessage Response, System.Text.Json.JsonDocument Body)> CancelAsync(string? token, Guid orderId, string? reason = "Đổi ý") =>
        _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/me/orders/{orderId}/cancel", new { reason }, token);

    public Task<(HttpResponseMessage Response, System.Text.Json.JsonDocument Body)> OwnerCancelAsync(string? token, Guid orderId, string? reason = "Khách gọi điện hủy") =>
        _api.SendJsonAsync(HttpMethod.Post, $"/api/v1/orders/{orderId}/cancel", new { reason }, token);

    /// <summary>A pending order of one service bought now; returns its id and code.</summary>
    public async Task<(Guid Id, string Code, decimal Total)> CreatePendingOrderAsync(string token, decimal price = 500_000)
    {
        var service = await _api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ", price: price);
        var (response, body) = await CreateOrderAsync(token, new { source = "buy_now", spaServiceId = service.Id });
        if (response.StatusCode != System.Net.HttpStatusCode.Created)
            throw new InvalidOperationException($"Creating the order failed: {response.StatusCode} {body.RootElement}");
        var data = CatalogApi.Data(body);
        return (data.GetProperty("id").GetGuid(), data.GetProperty("code").GetString()!, data.GetProperty("grandTotal").GetDecimal());
    }

    /// <summary>A customer account with its <c>customers</c> row, signed in; returns the access token and the customer id.</summary>
    public async Task<(string Token, Guid CustomerId)> LoginCustomerAsync()
    {
        var user = await _factory.CreateUserAsync(CatalogApi.Password, role: UserRole.Customer);
        await using (var context = _postgres.CreateContext())
        {
            context.Customers.Add(new Customer { Id = user.Id });
            await context.SaveChangesAsync();
        }
        var (_, body) = await AuthApiFactory.PostAsync(_api.Client, "/api/v1/auth/login", new { login = user.Email, password = CatalogApi.Password });
        return (body.RootElement.GetProperty("data").GetProperty("accessToken").GetString()!, user.Id);
    }

    public async Task<Guid> SeedCustomerAsync(string? fullName = null)
    {
        await using var context = _postgres.CreateContext();
        var unique = Guid.NewGuid().ToString("N");
        var user = new User
        {
            FullName = fullName ?? "Khách " + unique[..6],
            Email = $"customer-{unique}@spa.test",
            PhoneNumber = "09" + Random.Shared.NextInt64(10_000_000, 99_999_999),
            PasswordHash = "x",
            Role = UserRole.Customer,
            Status = UserStatus.Active,
        };
        context.Customers.Add(new Customer { Id = user.Id, User = user });
        await context.SaveChangesAsync();
        return user.Id;
    }

    public async Task<Promotion> SeedPromotionAsync(
        string? code = null, DiscountType type = DiscountType.Percentage, decimal value = 20, decimal? maxDiscount = null,
        decimal minOrder = 0, int? usageLimit = null, int? perCustomerLimit = null, PromotionStatus status = PromotionStatus.Active,
        DateTime? startsAtUtc = null, DateTime? endsAtUtc = null)
    {
        await using var context = _postgres.CreateContext();
        var now = _factory.Clock.UtcNow;
        var promotion = new Promotion
        {
            Code = code ?? NewCode(),
            Description = "Khuyến mãi thử",
            DiscountType = type,
            DiscountValue = value,
            MaxDiscountAmount = maxDiscount,
            MinOrderAmount = minOrder,
            StartsAtUtc = startsAtUtc ?? now.AddDays(-1),
            EndsAtUtc = endsAtUtc ?? now.AddDays(30),
            UsageLimit = usageLimit,
            PerCustomerLimit = perCustomerLimit,
            Status = status,
        };
        context.Promotions.Add(promotion);
        await context.SaveChangesAsync();
        return promotion;
    }

    /// <summary>An order with one service line (and a redemption of <paramref name="promotion"/> when given).</summary>
    public async Task<Order> SeedOrderAsync(
        Guid customerId, OrderStatus status, Promotion? promotion = null, decimal amount = 500_000, DateTime? paymentDueAtUtc = null,
        SpaService? service = null, DateTime? createdAtUtc = null)
    {
        service ??= await _api.SeedServiceAsync(CatalogApi.NewTag() + " dịch vụ", price: amount);
        await using var context = _postgres.CreateContext();
        var now = _factory.Clock.UtcNow;
        var order = new Order
        {
            Code = "DH" + Guid.NewGuid().ToString("N")[..12].ToUpperInvariant(),
            CustomerId = customerId,
            Subtotal = amount,
            GrandTotal = amount,
            Status = status,
            PaymentDueAtUtc = paymentDueAtUtc ?? (createdAtUtc ?? now).AddMinutes(15),
            CreatedAtUtc = createdAtUtc ?? now.AddMinutes(-1),
            CancelledAtUtc = status == OrderStatus.Cancelled ? now : null,
        };
        order.Items.Add(new OrderItem
        {
            OrderId = order.Id,
            SpaServiceId = service.Id,
            ProductName = service.Name,
            UnitPrice = amount,
            LineTotal = amount,
        });
        context.Orders.Add(order);
        if (promotion is not null)
        {
            context.PromotionRedemptions.Add(new PromotionRedemption
            {
                OrderId = order.Id,
                PromotionId = promotion.Id,
                PromotionCode = promotion.Code,
                DiscountAmount = 0,
                RedeemedAtUtc = now,
            });
        }
        await context.SaveChangesAsync();
        return order;
    }
}
