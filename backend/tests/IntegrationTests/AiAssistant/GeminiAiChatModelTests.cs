using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Interfaces.Ai;
using NhuNguyetSpa.Application.UseCases.AiAssistant;
using NhuNguyetSpa.Domain.Exceptions;
using NhuNguyetSpa.Infrastructure.Ai;
using Xunit;

namespace NhuNguyetSpa.IntegrationTests.AiAssistant;

/// <summary>The Gemini REST adapter against canned HTTP responses (docs/specs/ai-assistant.md: AI-T14). No network.</summary>
public sealed class GeminiAiChatModelTests
{
    private const string ThoughtSignature = "c2lnbmF0dXJl";

    private readonly StubHandler _handler = new();
    private readonly RecordingInvoker _tools = new();

    [Fact]
    public async Task ReturnsFinalAnswerArguments()
    {
        _handler.Enqueue(HttpStatusCode.OK, Response(Call("final_answer", """{"scope":"in_scope","answer":"Chào bạn"}""")));

        var completion = await Create().CompleteAsync(Request([new AiChatTurn("Q1", "A1")]), _tools, CancellationToken.None);

        completion.Blocked.Should().BeFalse();
        completion.FinalArguments!.Value.GetProperty("scope").GetString().Should().Be("in_scope");
        var sent = _handler.Requests.Single();
        sent.ApiKey.Should().Be("test-key");
        sent.Uri.Should().EndWith("models/gemini-3.8-flash:generateContent");
        sent.Body.GetProperty("toolConfig").GetProperty("functionCallingConfig").GetProperty("mode").GetString().Should().Be("ANY");
        sent.Body.GetProperty("systemInstruction").GetProperty("parts")[0].GetProperty("text").GetString().Should().Be("Hệ thống");
        sent.Body.GetProperty("generationConfig").GetProperty("maxOutputTokens").GetInt32().Should().Be(2048);
        var contents = sent.Body.GetProperty("contents").EnumerateArray().ToList();
        contents.Select(content => content.GetProperty("role").GetString()).Should().Equal("user", "model", "user");
        contents[^1].GetProperty("parts")[0].GetProperty("text").GetString().Should().Be("Câu hỏi");
        sent.Body.GetProperty("tools")[0].GetProperty("functionDeclarations").EnumerateArray()
            .Select(tool => tool.GetProperty("name").GetString()).Should().Contain("final_answer");
        _tools.Calls.Should().BeEmpty();
    }

    [Fact]
    public async Task RunsToolsThenFinishes()
    {
        var first = Response(
            Call("search_catalog", """{"keyword":"da"}""", ThoughtSignature),
            Call("find_available_slots", """{"serviceId":"x","date":"2026-11-07"}"""));
        _handler.Enqueue(HttpStatusCode.OK, first);
        _handler.Enqueue(HttpStatusCode.OK, Response(Call("final_answer", """{"scope":"in_scope","answer":"Ok"}""")));

        var completion = await Create().CompleteAsync(Request(), _tools, CancellationToken.None);

        completion.FinalArguments!.Value.GetProperty("answer").GetString().Should().Be("Ok");
        _tools.Calls.Select(call => call.Name).Should().Equal("search_catalog", "find_available_slots");
        _tools.Calls[0].Arguments.GetProperty("keyword").GetString().Should().Be("da");
    }

    [Fact]
    public async Task EchoesModelContentVerbatim()
    {
        var first = Response(
            Call("search_catalog", """{"keyword":"da"}""", ThoughtSignature),
            Call("find_available_slots", """{"serviceId":"x","date":"2026-11-07"}"""));
        _handler.Enqueue(HttpStatusCode.OK, first);
        _handler.Enqueue(HttpStatusCode.OK, Response(Call("final_answer", """{"scope":"in_scope","answer":"Ok"}""")));

        await Create().CompleteAsync(Request(), _tools, CancellationToken.None);

        var contents = _handler.Requests[1].Body.GetProperty("contents").EnumerateArray().ToList();
        var modelContent = JsonDocument.Parse(first).RootElement.GetProperty("candidates")[0].GetProperty("content");
        JsonElement.DeepEquals(contents[^2], modelContent).Should().BeTrue();
        contents[^2].GetProperty("parts")[0].GetProperty("thoughtSignature").GetString().Should().Be(ThoughtSignature);
        var responses = contents[^1];
        responses.GetProperty("role").GetString().Should().Be("user");
        responses.GetProperty("parts").EnumerateArray().Select(part => part.GetProperty("functionResponse").GetProperty("name").GetString())
            .Should().Equal("search_catalog", "find_available_slots");
        responses.GetProperty("parts")[0].GetProperty("functionResponse").GetProperty("response").GetProperty("result")
            .GetProperty("tool").GetString().Should().Be("search_catalog");
    }

    [Fact]
    public async Task SafetyFinishIsBlocked()
    {
        _handler.Enqueue(HttpStatusCode.OK, """{"candidates":[{"finishReason":"SAFETY","content":{"role":"model","parts":[]}}]}""");

        (await Create().CompleteAsync(Request(), _tools, CancellationToken.None)).Blocked.Should().BeTrue();
    }

    [Fact]
    public async Task BlockedPromptIsBlocked()
    {
        _handler.Enqueue(HttpStatusCode.OK, """{"promptFeedback":{"blockReason":"SAFETY"}}""");

        (await Create().CompleteAsync(Request(), _tools, CancellationToken.None)).Blocked.Should().BeTrue();
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, "{}")]
    [InlineData(HttpStatusCode.InternalServerError, "{}")]
    [InlineData(HttpStatusCode.OK, """{"candidates":[{"finishReason":"STOP","content":{"role":"model","parts":[{"text":"Chào bạn"}]}}]}""")]
    [InlineData(HttpStatusCode.OK, """{"candidates":[{"finishReason":"MAX_TOKENS","content":{"role":"model","parts":[]}}]}""")]
    [InlineData(HttpStatusCode.OK, "not json")]
    public async Task FailuresAreUnavailable(HttpStatusCode status, string body)
    {
        _handler.Enqueue(status, body);

        var act = () => Create().CompleteAsync(Request(), _tools, CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be(AiErrors.UnavailableCode);
    }

    [Fact]
    public async Task StopsAfterMaxToolRounds()
    {
        for (var i = 0; i < 5; i++)
            _handler.Enqueue(HttpStatusCode.OK, Response(Call("search_catalog", "{}")));

        var act = () => Create().CompleteAsync(Request(maxToolRounds: 2), _tools, CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be(AiErrors.UnavailableCode);
        _handler.Requests.Should().HaveCount(3);
    }

    [Fact]
    public async Task MissingKeySendsNothing()
    {
        var act = () => Create(apiKey: "").CompleteAsync(Request(), _tools, CancellationToken.None);

        (await act.Should().ThrowAsync<ServiceUnavailableException>()).Which.Code.Should().Be(AiErrors.UnavailableCode);
        _handler.Requests.Should().BeEmpty();
    }

    private GeminiAiChatModel Create(string apiKey = "test-key")
    {
        var options = new AiProviderOptions { ApiKey = apiKey };
        var client = new HttpClient(_handler) { BaseAddress = new Uri(options.BaseUrl) };
        return new GeminiAiChatModel(client, Options.Create(options), NullLogger<GeminiAiChatModel>.Instance);
    }

    private static AiChatRequest Request(IReadOnlyList<AiChatTurn>? history = null, int maxToolRounds = 4) =>
        new("Hệ thống", history ?? [], "Câu hỏi", AiToolCatalog.For(isCustomer: true), AiToolCatalog.FinalAnswer, maxToolRounds);

    private static string Call(string name, string args, string? signature = null)
    {
        var thought = signature is null ? "" : $",\"thoughtSignature\":\"{signature}\"";
        return "{\"functionCall\":{\"name\":\"" + name + "\",\"args\":" + args + "}" + thought + "}";
    }

    private static string Response(params string[] parts) =>
        "{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"role\":\"model\",\"parts\":[" + string.Join(",", parts) + "]}}]}";

    private sealed record SentRequest(string Uri, string? ApiKey, JsonElement Body);

    private sealed class StubHandler : HttpMessageHandler
    {
        private readonly Queue<(HttpStatusCode Status, string Body)> _responses = new();

        public List<SentRequest> Requests { get; } = [];

        public void Enqueue(HttpStatusCode status, string body) => _responses.Enqueue((status, body));

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var body = await request.Content!.ReadAsStringAsync(cancellationToken);
            Requests.Add(new SentRequest(request.RequestUri!.ToString(),
                request.Headers.TryGetValues("x-goog-api-key", out var values) ? values.Single() : null,
                JsonDocument.Parse(body).RootElement.Clone()));
            var (status, text) = _responses.Dequeue();
            return new HttpResponseMessage(status) { Content = new StringContent(text, Encoding.UTF8, "application/json") };
        }
    }

    private sealed class RecordingInvoker : IAiToolInvoker
    {
        public List<(string Name, JsonElement Arguments)> Calls { get; } = [];

        public Task<string> InvokeAsync(string name, JsonElement arguments, CancellationToken cancellationToken)
        {
            Calls.Add((name, arguments.Clone()));
            return Task.FromResult($$"""{"tool":"{{name}}"}""");
        }
    }
}
