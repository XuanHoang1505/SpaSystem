using System.Collections.Concurrent;
using System.Text.Json;
using NhuNguyetSpa.Application.Interfaces.Ai;

namespace NhuNguyetSpa.IntegrationTests.Infrastructure;

/// <summary>
/// Test double for Gemini: records each request and runs <see cref="Handler"/>, which may call tools through the real
/// executor before answering. Default: an in-scope "Chào bạn".
/// </summary>
public sealed class FakeAiChatModel : IAiChatModel
{
    public ConcurrentQueue<AiChatRequest> Requests { get; } = new();

    /// <summary>Tool name → JSON result seen in the latest chat, in call order.</summary>
    public ConcurrentQueue<(string Tool, string Result)> ToolResults { get; } = new();

    public Func<AiChatRequest, IAiToolInvoker, CancellationToken, Task<AiChatCompletion>> Handler { get; set; } =
        (_, _, _) => Task.FromResult(Final("in_scope", "Chào bạn"));

    public Task<AiChatCompletion> CompleteAsync(AiChatRequest request, IAiToolInvoker tools, CancellationToken cancellationToken)
    {
        Requests.Enqueue(request);
        return Handler(request, tools, cancellationToken);
    }

    public void Answer(string scope, string answer) => Handler = (_, _, _) => Task.FromResult(Final(scope, answer));

    public void CallThenAnswer(IEnumerable<(string Tool, object Args)> calls, string scope, string answer)
    {
        var steps = calls.ToList();
        Handler = async (_, tools, cancellationToken) =>
        {
            foreach (var (tool, args) in steps)
            {
                var result = await tools.InvokeAsync(tool, JsonSerializer.SerializeToElement(args), cancellationToken);
                ToolResults.Enqueue((tool, result));
            }
            return Final(scope, answer);
        };
    }

    public void Throw(Exception exception) => Handler = (_, _, _) => Task.FromException<AiChatCompletion>(exception);

    public static AiChatCompletion Final(string scope, string answer) =>
        new(JsonSerializer.SerializeToElement(new { scope, answer }), false);
}
