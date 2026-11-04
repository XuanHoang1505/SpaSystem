using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.IntegrationTests.Infrastructure;

namespace NhuNguyetSpa.IntegrationTests.AiAssistant;

/// <summary>Seeds customers and saved chat turns straight into the test database.</summary>
public sealed class AiAssistantApi
{
    private readonly PostgresFixture _postgres;

    public AiAssistantApi(PostgresFixture postgres) => _postgres = postgres;

    public async Task<Guid> SeedCustomerAsync()
    {
        await using var context = _postgres.CreateContext();
        var unique = Guid.NewGuid().ToString("N");
        var user = new User
        {
            FullName = "Khách " + unique[..6],
            Email = $"ai-{unique}@spa.test",
            PhoneNumber = "09" + Random.Shared.NextInt64(10_000_000, 99_999_999),
            PasswordHash = "x",
            Role = UserRole.Customer,
            Status = UserStatus.Active,
        };
        context.Customers.Add(new Customer { Id = user.Id, User = user });
        await context.SaveChangesAsync();
        return user.Id;
    }

    public async Task<AiChatMessage> SeedMessageAsync(Guid customerId, DateTime createdAtUtc, string question = "Hỏi", string answer = "Đáp", Guid? id = null)
    {
        await using var context = _postgres.CreateContext();
        var message = new AiChatMessage
        {
            Id = id ?? Guid.NewGuid(),
            CustomerId = customerId,
            Question = question,
            Answer = answer,
            CreatedAtUtc = createdAtUtc,
        };
        context.AiChatMessages.Add(message);
        await context.SaveChangesAsync();
        return message;
    }
}
