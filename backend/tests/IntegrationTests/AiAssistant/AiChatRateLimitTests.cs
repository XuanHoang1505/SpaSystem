using System.Net;
using FluentAssertions;
using NhuNguyetSpa.IntegrationTests.Catalog;
using NhuNguyetSpa.IntegrationTests.Infrastructure;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.AiAssistant;

/// <summary>Per-minute and per-day limits of <c>POST /ai/chat</c> (docs/specs/ai-assistant.md: BR-AI-06, AI-T12).</summary>
[Collection(PostgresCollection.Name)]
public sealed class AiChatRateLimitTests
{
    private readonly PostgresFixture _postgres;

    public AiChatRateLimitTests(PostgresFixture postgres) => _postgres = postgres;

    [Fact]
    public async Task MinuteLimit()
    {
        await using var factory = Factory(permit: 3, daily: 100);
        using var client = factory.CreateClient();

        for (var i = 0; i < 3; i++)
            (await AskAsync(client)).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        var (response, body) = await AskAsync(client);

        response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        CatalogApi.ErrorCode(body).Should().Be("rate_limited");
    }

    [Fact]
    public async Task DailyLimitResetsNextVietnamDay()
    {
        await using var factory = Factory(permit: 100, daily: 2);
        using var client = factory.CreateClient();

        (await AskAsync(client)).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await AskAsync(client)).Response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await AskAsync(client)).Response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);

        factory.Clock.Offset += TimeSpan.FromDays(1);

        (await AskAsync(client)).Response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private AuthApiFactory Factory(int permit, int daily) => new(_postgres.ConnectionString, settings: new Dictionary<string, string?>
    {
        ["Ai:RateLimit:PermitLimit"] = permit.ToString(),
        ["Ai:RateLimit:WindowSeconds"] = "60",
        ["Ai:RateLimit:DailyLimit"] = daily.ToString(),
    });

    private static Task<(HttpResponseMessage Response, System.Text.Json.JsonDocument Body)> AskAsync(HttpClient client) =>
        AuthApiFactory.PostAsync(client, "/api/v1/ai/chat", new { question = "Xin chào" });
}
