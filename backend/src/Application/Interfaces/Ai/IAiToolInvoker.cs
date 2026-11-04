using System.Text.Json;

namespace NhuNguyetSpa.Application.Interfaces.Ai;

/// <summary>Runs a tool the model called. Never throws for bad input: failures come back as <c>{"error": "..."}</c>.</summary>
public interface IAiToolInvoker
{
    Task<string> InvokeAsync(string name, JsonElement arguments, CancellationToken cancellationToken);
}
