using FluentAssertions;
using NhuNguyetSpa.Infrastructure.Repositories;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.AiAssistant;

/// <summary>Saved chat turns in PostgreSQL (docs/specs/ai-assistant.md: BR-AI-04, AI-T04, AI-T11).</summary>
[Collection(PostgresCollection.Name)]
public sealed class AiChatMessageRepositoryTests
{
    private static readonly DateTime T = new(2026, 11, 2, 3, 0, 0, DateTimeKind.Utc);

    private readonly PostgresFixture _postgres;
    private readonly AiAssistantApi _api;

    public AiChatMessageRepositoryTests(PostgresFixture postgres)
    {
        _postgres = postgres;
        _api = new AiAssistantApi(postgres);
    }

    [Fact]
    public async Task RecentReturnsNewestInChronologicalOrder()
    {
        var a = await _api.SeedCustomerAsync();
        var b = await _api.SeedCustomerAsync();
        for (var i = 1; i <= 7; i++)
            await _api.SeedMessageAsync(a, T.AddMinutes(i), question: $"A{i}");
        await _api.SeedMessageAsync(b, T.AddMinutes(8), question: "B1");
        await _api.SeedMessageAsync(b, T.AddMinutes(9), question: "B2");

        await using var context = _postgres.CreateContext();
        var recent = await new AiChatMessageRepository(context).GetRecentAsync(a, 5, CancellationToken.None);

        recent.Select(message => message.Question).Should().Equal("A3", "A4", "A5", "A6", "A7");
    }

    [Fact]
    public async Task RecentWithZeroCountIsEmpty()
    {
        var a = await _api.SeedCustomerAsync();
        await _api.SeedMessageAsync(a, T);

        await using var context = _postgres.CreateContext();
        (await new AiChatMessageRepository(context).GetRecentAsync(a, 0, CancellationToken.None)).Should().BeEmpty();
    }

    [Fact]
    public async Task PagesAreStableAndExclusive()
    {
        var a = await _api.SeedCustomerAsync();
        var other = await _api.SeedCustomerAsync();
        for (var i = 1; i <= 25; i++)
            await _api.SeedMessageAsync(a, T.AddMinutes(i), question: $"Q{i}");
        await _api.SeedMessageAsync(other, T.AddMinutes(30));

        await using var context = _postgres.CreateContext();
        var repository = new AiChatMessageRepository(context);
        var first = await repository.GetPageAsync(a, null, 21, CancellationToken.None);
        var second = await repository.GetPageAsync(a, first[19].CreatedAtUtc, 21, CancellationToken.None);

        first.Should().HaveCount(21);
        first[0].Question.Should().Be("Q25");
        second.Select(message => message.Question).Should().Equal("Q5", "Q4", "Q3", "Q2", "Q1");
        first.Take(20).Concat(second).Select(message => message.Id).Should().OnlyHaveUniqueItems().And.HaveCount(25);
    }

    [Fact]
    public async Task SameTimestampOrderedById()
    {
        var a = await _api.SeedCustomerAsync();
        var low = await _api.SeedMessageAsync(a, T, id: Guid.Parse("00000000-0000-0000-0000-000000000001"));
        var high = await _api.SeedMessageAsync(a, T, id: Guid.Parse("ffffffff-0000-0000-0000-000000000001"));

        await using var context = _postgres.CreateContext();
        var page = await new AiChatMessageRepository(context).GetPageAsync(a, null, 10, CancellationToken.None);

        page.Select(message => message.Id).Should().Equal(high.Id, low.Id);
    }
}
